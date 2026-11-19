// AI 처리 흐름. 반환 형식은 index.html 의 AI 모듈 주석(v3)과 같습니다.
import { z } from 'zod';
import { callJSON, hasLLM } from './llm';
import { guarded, llmVerify, rewriteCheck, ruleCheck, type GuardStep, type Violation } from './guardrail';
import {
  ASK_SYSTEM, askUser, BANDS, BYPASS_SYSTEM, PLACE_SYSTEM, placeUser, PREWRITE_SYSTEM, prewriteUser,
  RUBRIC_LEVELS, scoreSystem, scoreUser, SIGWAN_SYSTEM, sigwanUser,
} from './prompts';
import { evidenceLines, getArticle, LEVELS, PERSONAS, RUBRIC, type Level } from './content';
import { includesLoose, ngramSim, quoteRefs, sentences, textKey } from './text';
import { detectStance, ruleAnalyze } from './fallback';
import cache from './cache.json';

type Meta = { log: GuardStep[]; attempts: number; fallback: false | 'cache' | 'rule' | 'safe'; latencyMs: number; violations?: Violation[][] };
const CACHE = cache as Record<string, any>;
export const cacheKey = (kind: string, articleId: string, level: string, text: string, extra = '') => `${kind}:${articleId}:${level}:${textKey(text)}${extra ? ':' + extra : ''}`;
function fromCache(key: string) { const c = CACHE[key]; return c ? JSON.parse(JSON.stringify(c)) : null; }

/* ======================================================================
   [API 2] 논증 분석 + 페르소나 반론 (+ [API 3] 검수까지 서버에서)
   출력: {stance, structure:{claim, reasons[], premise}, weaknesses:[{type,detail,question}],
          rebuttal:{persona,text,question,source:{line,text}|null}, _meta}
   ====================================================================== */
const REF_BASE = 0;
const WEAK = ['근거 부족', '숨은 전제', '논리 비약', '반례를 다루지 않음', '성급한 일반화', '추측으로 끝난 근거'] as const;
const SigwanSchema = z.object({
  stance: z.string().nullable().catch(null),
  structure: z.object({
    claim: z.coerce.number().int(),
    reasons: z.array(z.coerce.number().int()).max(4).catch([]),
    premise: z.string().min(1),
  }),
  weaknesses: z.array(z.object({ type: z.string(), detail: z.string().min(1), question: z.string().min(1) })).min(1),
  rebuttal: z.object({ persona: z.string(), text: z.string().min(1), question: z.string().min(1), source_idx: z.coerce.number().int().nullable().catch(null) }),
});

export async function analyze(args: { articleId: string; level: string; text: string; personaIndex?: number }) {
  const a = getArticle(args.articleId);
  const level = getLevel2(args.level);
  const lv = LEVELS[level];
  const text = String(args.text || '').slice(0, 4000);
  const sents = sentences(text).slice(0, 30);
  if (!sents.length) throw new Error('빈 답안입니다');
  const pi = Math.max(0, Number(args.personaIndex) || 0);
  const ev = evidenceLines(a);
  // 후보 페르소나 3명: 다른 관점의 반론을 누를 때마다 다음 셋으로 넘어감
  const pool = a.personas.filter((id) => PERSONAS[id]);
  const cand = [0, 1, 2].map((k) => pool[(pi * 3 + k) % pool.length]).filter((v, i, s) => s.indexOf(v) === i);
  const stances = level === 'choshi' ? null : a.stances.map((s) => ({ id: s.id, label: s.label }));
  const key = cacheKey('analyze', a.id, level, text, String(pi));

  const toV3 = (r: z.infer<typeof SigwanSchema>) => {
    const ok = (i: number) => Number.isInteger(i) && i >= 0 && i < sents.length;
    const claimIdx = ok(r.structure.claim) ? r.structure.claim : 0;
    const reasons = r.structure.reasons.filter((i) => ok(i) && i !== claimIdx).slice(0, 2).map((i) => sents[i]);
    const persona = cand.includes(r.rebuttal.persona) ? r.rebuttal.persona : cand[0];
    const si = r.rebuttal.source_idx;
    const source = si != null && si >= 0 && si < ev.lines.length ? { line: si + 1, text: ev.lines[si], kind: ev.kind } : null;
    const stance = stances && r.stance && stances.some((s) => s.id === r.stance) ? r.stance : stances ? detectStance(a, text).id : null;
    // 지금 지시문은 0부터 번호를 매김. 유민 지시문(1부터)으로 바꾸면 REF_BASE 를 1로
    const q = (t: string) => quoteRefs(t, sents, REF_BASE);
    return {
      stance,
      structure: { claim: sents[claimIdx], reasons, premise: q(r.structure.premise), claimIndex: claimIdx + 1, premiseFrom: reasons.length ? sents.indexOf(reasons[0]) + 1 : null },
      weaknesses: r.weaknesses.slice(0, lv.weak).map((w) => ({ type: (WEAK as readonly string[]).includes(w.type) ? w.type : '논리 비약', detail: q(w.detail), question: q(w.question) })),
      rebuttal: { persona, text: q(r.rebuttal.text), question: q(r.rebuttal.question), source },
    };
  };
  type Out = ReturnType<typeof toV3>;
  const freeTexts = (f: Out) => [f.structure.premise, ...f.weaknesses.flatMap((w) => [w.detail, w.question]), f.rebuttal.text, f.rebuttal.question];

  if (!hasLLM()) return withFallback(key, () => ruleAnalyze(a, level, text, pi), '키가 없어 규칙 기반 예비 응답을 씁니다');

  const res = await guarded<Out>({
    label: `글의 구조를 나누고 ${cand.map((c) => PERSONAS[c].name).join(', ')} 중 한 관점의 반론을 씁니다`,
    generate: async (retryNote) => toV3(await callJSON({
      system: SIGWAN_SYSTEM,
      user: sigwanUser({
        title: a.title, lines: ev.lines, question: a.q[level], levelName: lv.name, weak: lv.weak, stances,
        personas: cand.map((id) => ({ id, ...PERSONAS[id] })), sents, retryNote,
      }),
      schema: SigwanSchema, temperature: 0.5, maxTokens: 1400,
    })),
    check: async (f, log) => {
      const free = freeTexts(f);
      const v = [...ruleCheck(free), ...rewriteCheck(free, text)];
      log({ state: v.length ? 'bad' : 'ok', text: `규칙과 유사도 검사: ${v.length ? `${v.length}건 걸림` : '대신 쓴 문장, 결론을 모는 표현 없음'}` });
      if (v.length) return v;
      const lvv = await llmVerify('AI 시관의 피드백 (사용자 답안에 대한 분석과 반론)', ev.lines, text, readable(f));
      log({ state: lvv.length ? 'bad' : 'ok', text: `검증 모델: ${lvv.length ? `위반 ${lvv.length}건` : '통과'}` });
      return lvv;
    },
    fallback: (last) => last ? safeFeedback(last) : (null as any),
  });
  if (res.fallback && !res.violations.flat().some((x) => x.type !== '생성 오류' && x.type !== '검증 불가')) {
    // 생성 자체가 실패(네트워크, 키, 시간 초과) → 저장된 응답 또는 규칙 기반
    return withFallback(key, () => ruleAnalyze(a, level, text, pi), 'AI 호출이 실패해 대체 응답을 씁니다', res.log);
  }
  return { ...res.output, _meta: meta(res, res.fallback ? 'safe' : false) };
}

function readable(f: { structure: { premise: string }; weaknesses: { type: string; detail: string; question: string }[]; rebuttal: { text: string; question: string; source: { text: string } | null } }) {
  return [
    `[숨은 전제] ${f.structure.premise}`,
    ...f.weaknesses.map((w) => `[짚어 볼 곳: ${w.type}] ${w.detail} / 질문: ${w.question}`),
    `[반론] ${f.rebuttal.text} / 질문: ${f.rebuttal.question}${f.rebuttal.source ? ` / 근거로 삼은 기사 줄: ${f.rebuttal.source.text}` : ''}`,
  ].join('\n');
}
/** 검증을 끝내 통과하지 못하면 문장은 모두 지우고 질문만 남깁니다 */
function safeFeedback<T extends { structure: any; weaknesses: any[]; rebuttal: any }>(f: T): T {
  return {
    ...f,
    structure: { ...f.structure, premise: '이 글에는 근거에서 주장으로 넘어가는 전제가 드러나 있지 않습니다.' },
    weaknesses: f.weaknesses.map((w) => ({ ...w, detail: '이 부분은 스스로 점검해 보세요.' })),
    rebuttal: { ...f.rebuttal, text: `${PERSONAS[f.rebuttal.persona]?.name || '다른 사람'}의 자리에서 이 주장을 다시 보면 어떻습니까?`, source: null },
  };
}

/* ======================================================================
   [API 4] 5기준 채점 (AAC&U, 기준당 1~10점, 처음 글과 고친 글을 따로 채점)
   출력: {before:{기준:점수}, after:{기준:점수}, why:{기준:{before:[string], after:[string]}}, total:{before,after,max}, _meta}
   ====================================================================== */
const CRIT = Object.keys(RUBRIC_LEVELS);
const OneCrit = z.object({ level: z.coerce.number().int().min(1).max(4), score: z.coerce.number(), why: z.array(z.string()).min(1).max(3), quote: z.string().default('') });
const ScoreSchema = z.object(Object.fromEntries(CRIT.map((k) => [k, OneCrit])) as Record<string, typeof OneCrit>);
type Graded = Record<string, { score: number; why: string[] }>;

async function gradeOne(question: string, text: string, defs: Record<string, string>): Promise<{ g: Graded; log: GuardStep[]; fallback: boolean }> {
  const res = await guarded<Graded>({
    label: '다섯 기준으로 채점합니다',
    maxAttempts: 2,
    generate: async (retryNote) => {
      const r = await callJSON({ system: scoreSystem(defs), user: scoreUser({ question, text }) + (retryNote ? `\n<이전 출력 거절 사유>\n${retryNote}\n</이전 출력 거절 사유>` : ''), schema: ScoreSchema, temperature: 0, maxTokens: 1400 });
      const g: Graded = {};
      for (const k of CRIT) {
        const c = r[k];
        const [lo, hi] = BANDS[c.level];
        const score = Math.min(hi, Math.max(lo, Math.round(c.score))); // 고른 단계의 띠 밖이면 띠 안으로
        const why = c.why.map((s) => s.trim()).filter(Boolean).slice(0, 2);
        if (c.quote && includesLoose(text, c.quote)) why.push(`글에서: "${c.quote.trim()}"`);
        g[k] = { score, why };
      }
      return g;
    },
    check: async (g, log) => {
      const free = CRIT.flatMap((k) => g[k].why.filter((w) => !w.startsWith('글에서: ')));
      const v = [...ruleCheck(free), ...rewriteCheck(free, text)];
      log({ state: v.length ? 'bad' : 'ok', text: `채점 근거 검사: ${v.length ? `${v.length}건 걸림` : '고쳐 쓴 문장 없음'}` });
      return v;
    },
    fallback: (last) => {
      if (!last) throw new Error('채점 생성 실패');
      return Object.fromEntries(CRIT.map((k) => [k, { score: last[k].score, why: ['이 기준의 근거 설명은 검사를 통과하지 못해 숨겼습니다.'] }]));
    },
  });
  return { g: res.output, log: res.log, fallback: res.fallback };
}

export async function score(args: { articleId: string; level: string; draft: string; revised: string; rubric?: Record<string, { def?: string; weight?: number }> }) {
  const a = getArticle(args.articleId);
  const level = getLevel2(args.level);
  const draft = String(args.draft || '').slice(0, 4000), revised = String(args.revised || '').slice(0, 4000);
  const defs = Object.fromEntries(CRIT.map((k) => [k, args.rubric?.[k]?.def || RUBRIC[k]?.def || '']));
  const weights = Object.fromEntries(CRIT.map((k) => [k, Math.max(0, Number(args.rubric?.[k]?.weight ?? 1)) || 0]));
  const key = cacheKey('score', a.id, level, draft + '\u0000' + revised, args.rubric ? textKey(JSON.stringify(args.rubric)) : '');
  const t0 = Date.now();
  if (!hasLLM()) { const c = fromCache(key); if (c) { c._meta = { ...c._meta, fallback: 'cache' }; return c; } throw new Error('LLM 키가 없고 저장된 채점도 없습니다'); }
  try {
    const same = draft.trim() === revised.trim();
    const [b, af] = await Promise.all([gradeOne(a.q[level], draft, defs), same ? null : gradeOne(a.q[level], revised, defs)]);
    const after = af || b;
    const total = (g: Graded) => {
      const wsum = CRIT.reduce((s, k) => s + weights[k], 0) || 1;
      return Math.round((CRIT.reduce((s, k) => s + g[k].score * weights[k], 0) / wsum) * CRIT.length * 10) / 10; // 가중치가 모두 1이면 단순 합(50점 만점)
    };
    return {
      before: Object.fromEntries(CRIT.map((k) => [k, b.g[k].score])),
      after: Object.fromEntries(CRIT.map((k) => [k, after.g[k].score])),
      why: Object.fromEntries(CRIT.map((k) => [k, { before: b.g[k].why, after: after.g[k].why }])),
      total: { before: total(b.g), after: total(after.g), max: CRIT.length * 10 },
      _meta: { log: [...b.log, ...(af?.log || [])], attempts: 1, fallback: b.fallback || af?.fallback ? 'safe' : false, latencyMs: Date.now() - t0 } as Meta,
    };
  } catch (e) {
    const c = fromCache(key);
    if (c) { c._meta = { ...c._meta, fallback: 'cache', error: String(e).slice(0, 120) }; return c; }
    throw e;
  }
}

/* ======================================================================
   우회 요청 분류 (요청 메시지만. 답안 본문은 분류하지 않음)
   ====================================================================== */
const BYPASS_RE = /고쳐\s?줘|고쳐\s?주|써\s?줘|써\s?주세|대신\s?써|대신\s?작성|모범\s?답|예시\s?답|예시\s?문장|정답\s?알려|첫\s?문장만|한\s?문장만|완성해\s?줘|다듬어\s?줘|다듬어\s?주|첨삭해|수정해\s?줘|바꿔\s?써|rewrite|re-write|write\s+(it|this|my|an?\s+essay|for me)|fix\s+(it|this|my)|polish|proofread|edit\s+(it|this|my)|give me (an? )?(example|sample|model answer)|first sentence/i;
const BypassSchema = z.object({ bypass: z.boolean(), category: z.string().default('없음') });

export async function classifyBypass(message: string): Promise<{ bypass: boolean; category: string; by: 'rule' | 'llm' | 'none' }> {
  const m = String(message || '').slice(0, 600);
  if (BYPASS_RE.test(m)) return { bypass: true, category: '직접 요청', by: 'rule' };
  if (!hasLLM()) return { bypass: false, category: '없음', by: 'none' };
  try {
    const r = await callJSON({ system: BYPASS_SYSTEM, user: `<메시지>${m}</메시지>`, schema: BypassSchema, fast: true, temperature: 0, maxTokens: 80 });
    return { bypass: r.bypass, category: r.category, by: 'llm' };
  } catch {
    return { bypass: false, category: '분류 실패', by: 'none' };
  }
}
/** 고쳐 쓰기 칸: 답안 본문이므로 문장 단위 규칙만 적용 (본문 속 "고쳐야 한다"는 막지 않음) */
export function revisedLooksLikeRequest(text: string) {
  const t = String(text || '').trim();
  if (!t) return false;
  return BYPASS_RE.test(t) && (t.length < 120 || sentences(t).some((s) => BYPASS_RE.test(s) && /(줘|주세요|해 ?줄래|please|\?)\s*[.!?]?$/i.test(s)));
}

/* ======================================================================
   [API 5] 시관에게 묻기 (재반박 포함)
   출력: {refused:boolean, kind:'refuse'|'rebuttal'|'answer', reply, _meta}
   ====================================================================== */
const AskSchema = z.object({ kind: z.enum(['rebuttal', 'answer']).catch('answer'), reply: z.string().min(1) });

export async function ask(args: { articleId: string; level: string; draft: string; question: string; feedback: any; chat?: { me?: any; t: string }[] }) {
  const a = getArticle(args.articleId);
  const level = getLevel2(args.level);
  const msg = String(args.question || '').slice(0, 600);
  const fb = args.feedback || {};
  const firstQ = fb?.weaknesses?.[0]?.question || '당신의 주장을 가장 강하게 받치는 근거는 무엇입니까?';
  const t0 = Date.now();
  const by = await classifyBypass(msg);
  if (by.bypass) {
    return { refused: true, kind: 'refuse', reply: `글은 대신 써 드리지 않습니다. 대신 하나만 묻겠습니다. ${firstQ}`, _meta: { log: [{ state: 'bad', text: `입력 가드레일: 대필 요청으로 분류 (${by.category}, ${by.by === 'rule' ? '규칙' : '분류 모델'})` }], attempts: 0, fallback: false, latencyMs: Date.now() - t0 } };
  }
  if (!hasLLM()) return { refused: false, kind: 'answer', reply: '그 답은 당신의 글 안에서 찾아보면 좋겠습니다. 어느 문장이 이 질문과 가장 가깝습니까?', _meta: { log: [], attempts: 0, fallback: 'rule', latencyMs: 0 } };
  const ev = evidenceLines(a);
  const draft = String(args.draft || '').slice(0, 4000);
  const feedbackText = fb?.rebuttal ? readable(fb) : '(없음)';
  const res = await guarded<z.infer<typeof AskSchema>>({
    label: '질문에 답을 씁니다',
    generate: (retryNote) => callJSON({
      system: ASK_SYSTEM,
      user: askUser({ title: a.title, lines: ev.lines, question: a.q[level], sents: sentences(draft), feedbackText, history: (args.chat || []).map((c) => ({ me: !!c.me, t: String(c.t || '') })), message: msg, retryNote }),
      schema: AskSchema, temperature: 0.4, maxTokens: 500,
    }),
    check: async (o, log) => {
      const v = [...ruleCheck([o.reply], true), ...rewriteCheck([o.reply], draft)];
      if (v.length) { log({ state: 'bad', text: `규칙과 유사도 검사: ${v.length}건 걸림` }); return v; }
      const lv = await llmVerify('AI 시관의 대화 응답 (질문이나 재반박에 대한 답)', ev.lines, `${draft}\n\n[사용자 메시지] ${msg}`, o.reply);
      log({ state: lv.length ? 'bad' : 'ok', text: `검증 모델: ${lv.length ? `위반 ${lv.length}건` : '통과'}` });
      return lv;
    },
    fallback: () => ({ kind: 'answer', reply: `그 질문은 스스로 답을 찾아보면 좋겠습니다. ${firstQ}` }),
  });
  return { refused: false, kind: res.output.kind, reply: res.output.reply, _meta: meta(res, res.fallback ? 'safe' : false) };
}

/* ======================================================================
   [API 1] 쓰기 전 생각할 거리: 출력 {questions:[3]}
   ====================================================================== */
const PrewriteSchema = z.object({ questions: z.array(z.string().min(3)).min(2).max(4) });
export async function prewrite(args: { articleId: string; level: string }) {
  const a = getArticle(args.articleId);
  const level = getLevel2(args.level);
  const base = ['이 기사에서 가장 큰 영향을 받는 사람은 누구라고 생각합니까?', '이 문제를 판단할 때 무엇을 가장 앞에 둡니까? 효율, 공정, 안전 중 하나를 고른다면요.', a.choshiQ];
  if (!hasLLM()) return { questions: base, _meta: { log: [], attempts: 0, fallback: 'rule', latencyMs: 0 } };
  const ev = evidenceLines(a);
  const res = await guarded<string[]>({
    label: '생각할 거리를 고릅니다',
    maxAttempts: 2,
    generate: async (retryNote) => (await callJSON({ system: PREWRITE_SYSTEM, user: prewriteUser({ title: a.title, lines: ev.lines, question: a.q[level], levelName: LEVELS[level].name, retryNote }), schema: PrewriteSchema, temperature: 0.6, maxTokens: 400 })).questions.slice(0, 3),
    check: async (qs, log) => { const v = ruleCheck(qs, true); log({ state: v.length ? 'bad' : 'ok', text: `규칙 검사 ${v.length ? `${v.length}건` : '통과'}` }); return v; },
    fallback: () => base,
  });
  return { questions: res.output, _meta: meta(res, res.fallback ? 'safe' : false) };
}

/* ======================================================================
   [API 7] 관점 지도 배치: 출력 {mine:index, argument}
   (그룹 목록은 화면 데이터에 이미 있으므로 서버는 내 글의 자리만 돌려줌)
   ====================================================================== */
const PlaceSchema = z.object({ group: z.coerce.number().int(), argument: z.string().default('') });
export async function place(args: { articleId: string; level: string; text: string }) {
  const a = getArticle(args.articleId);
  const level = getLevel2(args.level);
  const text = String(args.text || '').slice(0, 4000);
  const groups = a.clusters.map((c) => ({ i: c.i, label: c.label, text: c.text }));
  if (hasLLM()) {
    try {
      const r = await callJSON({ system: PLACE_SYSTEM, user: placeUser({ question: a.q[level], groups, text }), schema: PlaceSchema, fast: true, temperature: 0, maxTokens: 200 });
      if (groups.some((g) => g.i === r.group)) return { mine: r.group, argument: r.argument, by: 'llm' };
    } catch { /* 아래 유사도로 대체 */ }
  }
  const scored = groups.map((g) => ({ i: g.i, s: ngramSim(g.text, text) })).sort((x, y) => y.s - x.s);
  return { mine: scored[0]?.i ?? 0, argument: '', by: 'similarity' };
}

/* ---------- 공통 ---------- */
function getLevel2(l: string): Level {
  if (l === 'choshi' || l === 'boksi') return l;
  if (l === 'jeonsi') throw new Error('전시는 아직 준비 중입니다');
  throw new Error(`알 수 없는 난이도입니다: ${l}`);
}
function meta(res: { log: GuardStep[]; attempts: number; latencyMs: number; violations: Violation[][] }, fallback: Meta['fallback']): Meta {
  return { log: res.log, attempts: res.attempts, fallback, latencyMs: res.latencyMs, violations: res.violations };
}
function withFallback(key: string, rule: () => any, why: string, log: GuardStep[] = []) {
  const c = fromCache(key);
  if (c) { c._meta = { ...(c._meta || {}), log: [...log, { state: 'bad', text: `${why}: 미리 저장해 둔 실제 AI 응답을 보여 줍니다` }], fallback: 'cache' }; return c; }
  return { ...rule(), _meta: { log: [...log, { state: 'bad', text: `${why}: 규칙 기반 예비 응답입니다` }], attempts: 0, fallback: 'rule', latencyMs: 0 } as Meta };
}
