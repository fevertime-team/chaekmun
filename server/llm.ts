// LLM 호출 어댑터: 대회 제공 모델을 환경 변수만 바꿔 쓸 수 있게 fetch 로 직접 부릅니다.
//   LLM_PROVIDER   anthropic (기본, 대회 키) | openai (OpenAI 호환 Chat Completions)
//   LLM_BASE_URL   예) https://api.openai.com/v1  (openai 방식은 이 주소 뒤에 /chat/completions 를 붙임)
//   LLM_API_KEY    키 (Vercel 환경 변수에만). 없으면 ANTHROPIC_API_KEY 를 씀 (대회 안내서의 이름)
//   LLM_MODEL      분석, 반론, 채점용
//   LLM_MODEL_FAST 검증, 분류, 배치용 (없으면 LLM_MODEL)
//   LLM_JSON_MODE  1 이면 response_format: json_object 를 함께 보냄 (제공처가 지원할 때만)
//   LLM_TIMEOUT_MS 호출 하나의 제한 시간 (기본 40000)
import type { ZodTypeAny, z } from 'zod';

const env = (k: string, d = '') => (process.env[k] ?? d).trim();
const KEY = () => env('LLM_API_KEY') || env('ANTHROPIC_API_KEY');
export const hasLLM = () => Boolean(KEY());
export const PROVIDER = () => env('LLM_PROVIDER', 'anthropic').toLowerCase();
export const MODEL = () => env('LLM_MODEL', 'claude-sonnet-5-5');
export const MODEL_FAST = () => env('LLM_MODEL_FAST', 'claude-haiku-5-5');

export type Usage = { calls: number; inTok: number; outTok: number };
export const usage: Usage = { calls: 0, inTok: 0, outTok: 0 };

async function rawCall(o: { system: string; user: string; fast?: boolean; temperature: number; maxTokens: number }): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Number(env('LLM_TIMEOUT_MS', '40000')));
  const model = o.fast ? MODEL_FAST() : MODEL();
  try {
    if (PROVIDER() === 'anthropic') {
      const base = env('LLM_BASE_URL', 'https://api.anthropic.com').replace(/\/$/, '');
      const r = await fetch(`${base}/v1/messages`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json', 'x-api-key': KEY(), 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: o.maxTokens, temperature: o.temperature, system: o.system, messages: [{ role: 'user', content: o.user }] }),
      });
      const j: any = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`LLM ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
      usage.calls++; usage.inTok += j.usage?.input_tokens || 0; usage.outTok += j.usage?.output_tokens || 0;
      return (j.content || []).map((b: any) => (b.type === 'text' ? b.text : '')).join('');
    }
    const base = env('LLM_BASE_URL', 'https://api.openai.com/v1').replace(/\/$/, '');
    const body: any = {
      model,
      temperature: o.temperature,
      max_tokens: o.maxTokens,
      messages: [{ role: 'system', content: o.system }, { role: 'user', content: o.user }],
    };
    if (env('LLM_JSON_MODE') === '1') body.response_format = { type: 'json_object' };
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY()}` },
      body: JSON.stringify(body),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`LLM ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
    usage.calls++; usage.inTok += j.usage?.prompt_tokens || 0; usage.outTok += j.usage?.completion_tokens || 0;
    const c = j.choices?.[0]?.message?.content;
    return Array.isArray(c) ? c.map((p: any) => p.text || '').join('') : String(c ?? '');
  } finally {
    clearTimeout(timer);
  }
}

export function extractJSON(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('JSON 객체를 찾지 못했습니다');
  return JSON.parse(body.slice(start, end + 1));
}

/** JSON 하나를 받아 zod 로 검사. 형식이 틀리면 사유를 붙여 다시 요청 (네트워크 오류는 그대로 던짐) */
export async function callJSON<S extends ZodTypeAny>(opts: {
  system: string;
  user: string;
  schema: S;
  fast?: boolean;
  temperature?: number;
  maxTokens?: number;
  formatRetries?: number;
}): Promise<z.infer<S>> {
  const { system, schema, fast, temperature = 0.4, maxTokens = 1500, formatRetries = 1 } = opts;
  let user = opts.user;
  let lastErr: unknown;
  for (let i = 0; i <= formatRetries; i++) {
    const text = await rawCall({ system, user, fast, temperature, maxTokens });
    try {
      return schema.parse(extractJSON(text));
    } catch (e) {
      lastErr = e;
      user = `${opts.user}\n\n<형식 오류>직전 출력이 요구한 JSON 형식에 맞지 않았습니다: ${String(e).slice(0, 300)}. 설명 없이 JSON 하나만 다시 출력하십시오.</형식 오류>`;
    }
  }
  throw new Error(`LLM 출력 형식 오류: ${String(lastErr).slice(0, 300)}`);
}
