// 출력 가드레일 (v1 lib/guardrail.ts 를 옮겨 고침)
// 1 규칙 검사(금지 표현) → 2 유사도 검사(사용자 문장을 고쳐 쓴 흔적) → 3 검증 LLM(별도 호출)
// 하나라도 걸리면 위반 사유를 붙여 다시 생성(최대 3회), 끝까지 실패하면 질문만 남긴 안전한 출력으로 대체합니다.
// 위반을 일부러 만들어 보여 주는 연출 코드는 없습니다. 걸러낸 기록은 실제로 걸린 것만 남습니다.
import { z } from 'zod';
import { callJSON, hasLLM } from './llm';
import { compact, includesLoose, ngramSim, sentences } from './text';
import { VERIFY_SYSTEM, verifyUser } from './prompts';

export type Violation = { type: string; evidence: string; by: 'rule' | 'similarity' | 'llm' };
export type GuardStep = { state: 'ok' | 'run' | 'bad'; text: string };
export type GuardResult<T> = { output: T; attempts: number; fallback: boolean; log: GuardStep[]; violations: Violation[][]; latencyMs: number };

export const BANNED: Record<string, string[]> = {
  '결론을 중간으로 모는 표현': ['양쪽 다 일리', '양쪽 모두 일리', '둘 다 일리', '둘 다 맞', '중간 지점', '절충', '균형 잡힌 시각', '균형 있게 보', '양쪽을 모두 고려'],
  '대신 써 주는 표현': ['예시 문장', '모범 답안', '모범 문장', '예시 답안', '첫 문장은', '이렇게 써 보', '다음과 같이 써', '라고 쓰면', '라고 써 보', '처럼 쓰면', '라고 적으면', '라고 적어 보'],
  '고쳐 쓰는 표현': ['이렇게 고쳐', '이렇게 바꿔', '바꿔 쓰면', '고쳐 쓰면', '로 고치면', '로 바꾸면', '수정하면 다음', '로 다듬'],
  '판정': ['당신이 옳', '당신의 입장이 맞', '정답은', '옳은 입장은', '반대 입장이 옳', '틀린 입장', '반론이 맞습니다', '반론이 틀렸'],
  '입장 변경 권유': ['입장을 바꾸', '입장을 재고', '생각을 바꾸시', '반대편으로 돌아'],
};
export const COACH_BANNED: Record<string, string[]> = {
  '입장 제시': ['찬성하는 게 맞', '반대하는 게 맞', '쪽이 더 설득력', '쪽이 옳', '쪽을 추천'],
  '개요 제공': ['첫 문단', '두 번째 문단', '서론에서', '본론에서', '결론에서는', '1문단', '2문단'],
};

export function ruleCheck(texts: string[], extra = false): Violation[] {
  const v: Violation[] = [];
  const dict = extra ? { ...BANNED, ...COACH_BANNED } : BANNED;
  for (const t of texts) for (const [type, words] of Object.entries(dict)) for (const w of words) if (t.includes(w)) v.push({ type, evidence: w, by: 'rule' });
  return v;
}

/** 사용자 문장과 거의 같지만 그대로 인용한 것은 아닌 문장 = 고쳐 쓴 흔적. 그대로 인용은 허용 */
export function rewriteCheck(freeTexts: string[], userText: string): Violation[] {
  const userSents = sentences(userText).filter((s) => compact(s).length >= 8);
  if (!userSents.length) return [];
  const v: Violation[] = [];
  for (const t of freeTexts) {
    for (let s of sentences(t)) {
      s = s.replace(/["“「『']([^"”」』']{4,})["”」』']/g, (m, q) => (includesLoose(userText, q) ? ' ' : m));
      if (compact(s).length < 10) continue;
      for (const u of userSents) {
        if (includesLoose(s, u)) continue;
        const sim = ngramSim(s, u);
        if (sim >= 0.72) { v.push({ type: '사용자 문장을 고쳐 쓴 흔적', evidence: `${s} (유사도 ${sim.toFixed(2)})`, by: 'similarity' }); break; }
      }
    }
  }
  return v;
}

const VerifySchema = z.object({
  pass: z.boolean(),
  violations: z.array(z.object({ type: z.string(), evidence: z.string().default('') })).default([]),
});

export async function llmVerify(mode: string, articleLines: string[], userText: string, output: string): Promise<Violation[]> {
  if (!hasLLM()) return [];
  const r = await callJSON({ system: VERIFY_SYSTEM, user: verifyUser({ mode, articleLines, userText, output }), schema: VerifySchema, fast: true, temperature: 0, maxTokens: 500 });
  return r.pass && !r.violations.length ? [] : r.violations.map((x) => ({ type: x.type, evidence: x.evidence, by: 'llm' as const }));
}

/** 생성 → 검사 → 재생성 루프 */
export async function guarded<T>(opts: {
  label: string;
  generate: (retryNote?: string) => Promise<T>;
  check: (out: T, log: (s: GuardStep) => void) => Promise<Violation[]>;
  fallback: (last: T | null) => T;
  maxAttempts?: number;
}): Promise<GuardResult<T>> {
  const t0 = Date.now();
  const log: GuardStep[] = [];
  const push = (s: GuardStep) => log.push(s);
  const all: Violation[][] = [];
  const max = opts.maxAttempts ?? 3;
  let last: T | null = null;
  let retryNote: string | undefined;
  let genErrors = 0;
  for (let i = 0; i < max; i++) {
    push({ state: 'ok', text: `${i === 0 ? '' : `${i + 1}번째 시도: `}${opts.label}` });
    let out: T;
    try {
      out = await opts.generate(retryNote);
    } catch (e) {
      genErrors++;
      push({ state: 'bad', text: `생성 오류: ${String(e).slice(0, 100)}` });
      all.push([{ type: '생성 오류', evidence: String(e).slice(0, 200), by: 'rule' }]);
      if (genErrors >= 2) break; // 네트워크나 키 문제면 오래 끌지 않고 대체 응답으로
      continue;
    }
    last = out;
    let v: Violation[];
    try {
      v = await opts.check(out, push);
    } catch (e) {
      push({ state: 'bad', text: `검증 호출 오류: ${String(e).slice(0, 100)}` });
      v = [{ type: '검증 불가', evidence: String(e).slice(0, 120), by: 'llm' }];
    }
    all.push(v);
    if (!v.length) return { output: out, attempts: i + 1, fallback: false, log, violations: all, latencyMs: Date.now() - t0 };
    for (const x of v.slice(0, 4)) push({ state: 'bad', text: `걸러냄 (${x.by === 'rule' ? '규칙' : x.by === 'similarity' ? '유사도' : '검증 모델'}): ${x.type}` });
    retryNote = v.map((x) => `- ${x.type}: "${x.evidence}"`).join('\n');
  }
  push({ state: 'bad', text: '검증을 통과한 출력이 없어 질문만 남긴 안전한 응답으로 바꿨습니다' });
  return { output: opts.fallback(last), attempts: all.length, fallback: true, log, violations: all, latencyMs: Date.now() - t0 };
}
