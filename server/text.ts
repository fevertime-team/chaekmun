// 문장 분리와 유사도. sentences() 는 화면(index.html)의 sentences 와 같은 규칙이어야
// 서버가 돌려준 문장 번호와 화면의 밑줄 위치가 맞습니다.
export function sentences(t: string): string[] {
  return String(t || '')
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const compact = (s: string) => s.replace(/[\s.,!?'"“”‘’()\[\]·~…-]/g, '');

function grams(s: string, n = 2): Map<string, number> {
  const c = compact(s);
  const m = new Map<string, number>();
  for (let i = 0; i <= c.length - n; i++) {
    const g = c.slice(i, i + n);
    m.set(g, (m.get(g) || 0) + 1);
  }
  return m;
}

/** 글자 바이그램 코사인 유사도 (0~1) */
export function ngramSim(a: string, b: string): number {
  const A = grams(a), B = grams(b);
  let dot = 0, na = 0, nb = 0;
  A.forEach((v, k) => { na += v * v; const w = B.get(k); if (w) dot += v * w; });
  B.forEach((v) => { nb += v * v; });
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function includesLoose(hay: string, needle: string): boolean {
  const n = compact(needle);
  return n.length > 0 && compact(hay).includes(n);
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const textKey = (s: string) => hash(compact(s)).toString(36);

/** (v4.1) 피드백 글 속 문장 번호 "[n]" 을 그 문장의 짧은 그대로 인용으로 바꿉니다.
 *  화면은 주장에 번호가 없고 근거만 [1], [2]로 세므로, 답안 전체 문장 번호를 그대로 보여 주면 어긋납니다.
 *  base: 지시문이 1부터 세면 1(유민 feedback 지시문), 0부터 세면 0 */
export function quoteRefs(t: string, sents: string[], base = 1): string {
  if (!t) return t;
  // "문장"은 받침이 있으므로 뒤따르는 조사를 받침 있는 꼴로 맞춤
  const J: Record<string, string> = { 는: '은', 은: '은', 가: '이', 이: '이', 를: '을', 을: '을', 와: '과', 과: '과', 로: '으로', 으로: '으로', 의: '의', 에서: '에서', 에: '에', 도: '도', 만: '만', 까지: '까지', 처럼: '처럼', 보다: '보다' };
  return t.replace(/\[(\d{1,2})\](?:\s*번)?(?:\s*문장)?(으로|에서|까지|처럼|보다|[는은가이를을와과로의에도만])?/g, (m, n, josa) => {
    const s = sents[Number(n) - base];
    if (!s) return m;
    const short = s.length > 28 ? s.slice(0, 26).trim() + '…' : s;
    return `"${short}" 문장${josa ? J[josa] : ''}`;
  });
}
