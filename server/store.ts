// Supabase 저장소 (서버에서만). 브라우저는 /api/db 를 부르고, 키는 Vercel 환경 변수에만 있습니다.
//   SUPABASE_URL                         Vercel의 Supabase 연동이 자동으로 넣어 줌
//   SUPABASE_SERVICE_ROLE_KEY | SUPABASE_SECRET_KEY   서버 전용 키 (브라우저에 절대 보내지 않음)
//   SUPABASE_JWT_SECRET                  로그인 토큰 서명용 (없으면 서버 키로 대신)
// 테이블: app_users, essays, votes, class_settings (docs/supabase.sql). RLS 를 켜고 정책을 두지 않아 서버 키로만 접근됩니다.
// 설정이 없으면 on:false 를 돌려주고, 화면은 지금처럼 브라우저 메모리만 씁니다.
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { HttpError } from './content';

const env = (k: string) => (process.env[k] ?? '').trim();
const URL_ = () => env('SUPABASE_URL').replace(/\/$/, '');
const KEY = () => env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
export const hasStore = () => Boolean(URL_() && KEY());

async function rest(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}) {
  const key = KEY();
  const headers: Record<string, string> = { apikey: key, 'content-type': 'application/json' };
  if (key.startsWith('eyJ')) headers.authorization = `Bearer ${key}`; // 옛 service_role(JWT) 키일 때만
  if (init.prefer) headers.prefer = init.prefer;
  const r = await fetch(`${URL_()}/rest/v1/${path}`, { method: init.method || 'GET', headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
  const text = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

/* ---------- 로그인 토큰: 사용자 id 에 서버 비밀값으로 서명 ---------- */
const SECRET = () => env('SUPABASE_JWT_SECRET') || KEY();
const sign = (uid: string) => `${uid}.${createHmac('sha256', SECRET()).update(uid).digest('base64url')}`;
function verify(token: unknown): string {
  const t = String(token || '');
  const i = t.lastIndexOf('.');
  if (i < 1) throw new HttpError(401, '다시 로그인해 주세요.');
  const uid = t.slice(0, i);
  const a = Buffer.from(sign(uid)), b = Buffer.from(t);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, '다시 로그인해 주세요.');
  return uid;
}

/* ---------- 비밀번호: scrypt + 소금 ---------- */
const hashPw = (pw: string) => { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(pw, salt, 32).toString('hex')}`; };
const checkPw = (pw: string, stored: string) => {
  const [salt, h] = String(stored).split(':');
  if (!salt || !h) return false;
  const a = scryptSync(pw, salt, 32), b = Buffer.from(h, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
};

const RESERVED = new Set(['demo', 'student', 'professor', 'example', 'admin']); // 화면의 시연 계정 이름
const SCOPES = new Set(['p', 'o']);
const ROLES = new Set(['personal', 'student', 'professor']);
const KINDS = new Set(['ag', 'pn']);
const enc = encodeURIComponent;

type UserRow = { id: string; scope: string; username: string; pw_hash: string; nickname: string; role: string; class_id: string | null; org_id: string | null };
const pub = (u: UserRow) => ({ id: u.id, scope: u.scope, username: u.username, nickname: u.nickname, role: u.role, classId: u.class_id, org: u.org_id, profile: null });

async function getUser(uid: string): Promise<UserRow> {
  const rows = await rest(`app_users?id=eq.${enc(uid)}&select=*`);
  if (!rows?.length) throw new HttpError(401, '다시 로그인해 주세요.');
  return rows[0];
}

export async function db(b: any) {
  const op = String(b?.op || '');
  if (!hasStore()) return { on: false };

  if (op === 'load') {
    const [essays, votes, classes] = await Promise.all([
      rest('essays?published=eq.true&select=data&order=created_at.asc&limit=2000'),
      rest('votes?select=user_id,essay_id,kind&limit=20000'),
      rest('class_settings?select=*'),
    ]);
    return {
      on: true,
      essays: (essays || []).map((r: any) => r.data),
      votes: (votes || []).map((v: any) => [v.user_id, v.essay_id, v.kind]),
      classes: Object.fromEntries((classes || []).map((c: any) => [c.class_id, { rubric: c.rubric, focus: c.focus, assigned: c.assigned }])),
    };
  }

  if (op === 'signUp') {
    const scope = String(b.scope), username = String(b.username || ''), password = String(b.password || '');
    const nickname = String(b.nickname || '').trim(), role = String(b.role || 'personal');
    if (!SCOPES.has(scope) || !ROLES.has(role)) throw new HttpError(400, '잘못된 요청입니다.');
    if (!/^[A-Za-z0-9]{4,20}$/.test(username)) throw new HttpError(400, '아이디는 영문과 숫자 4~20자로 정해 주세요.');
    if (RESERVED.has(username.toLowerCase())) throw new HttpError(400, '이미 쓰이는 아이디입니다.');
    if (password.length < 6) throw new HttpError(400, '비밀번호는 6자 이상으로 정해 주세요.');
    if (!nickname || nickname.length > 12) throw new HttpError(400, '닉네임은 1~12자로 적어 주세요.');
    const row: UserRow = {
      id: 'r' + randomUUID().replace(/-/g, '').slice(0, 16), scope, username: username.toLowerCase(), pw_hash: hashPw(password),
      nickname, role, class_id: b.classId ? String(b.classId).slice(0, 60) : null, org_id: b.org ? String(b.org).slice(0, 60) : null,
    };
    try { await rest('app_users', { method: 'POST', body: row, prefer: 'return=minimal' }); }
    catch (e) { if (String(e).includes('409') || String(e).includes('23505')) throw new HttpError(400, '이미 쓰이는 아이디입니다.'); throw e; }
    return { on: true, user: { ...pub(row), username }, token: sign(row.id) };
  }

  if (op === 'signIn') {
    const scope = String(b.scope), username = String(b.username || '').toLowerCase();
    const rows = await rest(`app_users?scope=eq.${enc(scope)}&username=eq.${enc(username)}&select=*`);
    const u: UserRow | undefined = rows?.[0];
    if (!u || !checkPw(String(b.password || ''), u.pw_hash)) throw new HttpError(400, '아이디나 비밀번호가 맞지 않습니다.');
    return { on: true, user: pub(u), token: sign(u.id) };
  }

  /* 아래는 로그인한 사용자만 */
  const uid = verify(b.token);

  if (op === 'saveEssay') {
    const e = b.essay || {};
    const json = JSON.stringify(e);
    if (json.length > 60000) throw new HttpError(400, '글이 너무 깁니다.');
    const id = String(e.id || '');
    if (!/^r[0-9a-z]{8,40}$/i.test(id)) throw new HttpError(400, '잘못된 글 번호입니다.');
    const data = { ...e, userId: uid, isExample: false };
    await rest('essays', {
      method: 'POST', prefer: 'return=minimal',
      body: { id, user_id: uid, nickname: String(e.nickname || '').slice(0, 20), article_id: String(e.articleId || ''), level: String(e.level || ''), class_id: e.classId || null, published: e.published !== false, data },
    });
    return { ok: true };
  }

  if (op === 'toggleVote') {
    const essayId = String(b.essayId || ''), kind = String(b.kind || '');
    if (!essayId || !KINDS.has(kind)) throw new HttpError(400, '잘못된 투표입니다.');
    const q = `votes?user_id=eq.${enc(uid)}&essay_id=eq.${enc(essayId)}&kind=eq.${enc(kind)}`;
    const del = await rest(q, { method: 'DELETE', prefer: 'return=representation' });
    if (del?.length) return { voted: false };
    await rest('votes', { method: 'POST', body: { user_id: uid, essay_id: essayId, kind }, prefer: 'return=minimal' });
    return { voted: true };
  }

  if (op === 'saveClass') {
    const u = await getUser(uid);
    if (u.role !== 'professor' || !u.class_id || u.class_id !== String(b.classId)) throw new HttpError(403, '이 반의 교수 계정만 바꿀 수 있습니다.');
    const patch: Record<string, unknown> = { class_id: u.class_id, updated_at: new Date().toISOString() };
    for (const k of ['rubric', 'focus', 'assigned']) if (k in (b.patch || {})) patch[k] = b.patch[k];
    await rest('class_settings', { method: 'POST', body: patch, prefer: 'resolution=merge-duplicates,return=minimal' });
    return { ok: true };
  }

  throw new HttpError(400, `알 수 없는 요청입니다: ${op}`);
}
