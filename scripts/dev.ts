// 로컬 점검용 서버: index.html 과 api/*.ts 를 Vercel 없이 한 주소(http://localhost:3000)에서 돌립니다.
//   npm run dev
// 키는 이 폴더의 .env.local 에 ANTHROPIC_API_KEY=sk-ant-... 한 줄로 넣습니다 (gitignore 됨).
// 요청이 올 때마다 .env.local 을 다시 읽으므로, 키를 넣고 저장만 하면 서버를 다시 켤 필요가 없습니다.
// 이 스크립트는 키 값을 화면이나 로그에 출력하지 않습니다.
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3200);
const ROUTES = ['analyze', 'ask', 'check', 'db', 'place', 'prewrite', 'score', 'status', 'usage'];
const root = path.join(__dirname, '..');
const envFile = path.join(root, '.env.local');
const ENV_KEYS = ['ANTHROPIC_API_KEY', 'LLM_API_KEY', 'LLM_PROVIDER', 'LLM_MODEL', 'LLM_MODEL_FAST', 'LLM_BASE_URL', 'LLM_TIMEOUT_MS', 'LLM_JSON_MODE',
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'SUPABASE_JWT_SECRET'];

/** .env.local 을 읽어 process.env 에 반영. 파일에서 지운 값은 환경에서도 지움 */
let lastKeyState = '';
function loadEnv() {
  const vals: Record<string, string> = {};
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && ENV_KEYS.includes(m[1])) vals[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  for (const k of ENV_KEYS) {
    if (vals[k]) process.env[k] = vals[k];
    else delete process.env[k];
  }
  const key = process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY || '';
  const state = !key ? '없음, 규칙 기반(목업)' : key.startsWith('sk-ant-') ? '있음, 실제 Claude 호출' : '있음 (sk-ant- 로 시작하지 않음, 확인 필요)';
  if (state !== lastKeyState) { console.log(`Claude 키: ${state}`); lastKeyState = state; }
}

function shimRes(res: http.ServerResponse) {
  const r: any = res;
  r.status = (c: number) => { res.statusCode = c; return r; };
  r.json = (o: unknown) => { res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); return r; };
  return r;
}

// 대략의 비용 상한 (모두 Sonnet 5.5 요금으로 계산: 입력 $2, 출력 $10 / 100만 토큰, 1달러 1,450원)
const won = (u: { inTok: number; outTok: number }) => Math.round(((u.inTok * 2 + u.outTok * 10) / 1e6) * 1450);

http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const m = url.pathname.match(/^\/api\/([a-z]+)$/);
  if (m && ROUTES.includes(m[1])) {
    loadEnv();
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = Buffer.concat(chunks).toString('utf8');
    const mod = await import(`../api/${m[1]}.ts`);
    const vreq: any = Object.assign(req, { body: body ? JSON.parse(body) : {}, query: Object.fromEntries(url.searchParams) });
    const t0 = Date.now();
    await mod.default(vreq, shimRes(res));
    console.log(`${req.method} ${url.pathname} → ${res.statusCode} (${Date.now() - t0}ms)`);
    if (m[1] !== 'status') {
      const L = await import('../server/llm');
      console.log(`  누적: 호출 ${L.usage.calls}회, 입력 ${L.usage.inTok} / 출력 ${L.usage.outTok} 토큰, 약 ${won(L.usage)}원 이하`);
    }
    return;
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    return res.end(readFileSync(path.join(root, 'index.html')));
  }
  if (url.pathname === '/usage.html') {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    return res.end(readFileSync(path.join(root, 'usage.html')));
  }
  res.statusCode = 404; res.end('not found');
}).listen(PORT, () => {
  console.log(`오늘의 책문 로컬 서버: http://localhost:${PORT}`);
  loadEnv();
});
