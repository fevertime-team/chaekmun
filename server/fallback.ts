// 규칙 기반 대체 응답. LLM 키가 없거나 호출이 모두 실패했고, 저장된 응답(cache.json)도 없을 때만 씁니다.
// (v3 목업의 규칙을 그대로 옮김. 화면에는 "예비 응답"으로 표시)
import type { Article, Level } from './content';
import { LEVELS } from './content';
import { sentences } from './text';

const EVID = ['때문', '왜냐하면', '예를 들어', '실제로', '결과', '조사', '따르면', '기사', '%', '최근', '사례', '사건'];
const HEDGE = ['것 같다', '것 같습니다', '아닐까', '지도 모른다', '듯하다'];
const CONCEDE = ['물론', '하지만', '반면', '그럼에도', '라는 반론', '라는 지적'];
const has = (t: string, l: string[]) => l.some((k) => t.includes(k));

export function detectStance(a: Article, text: string) {
  let best = a.stances[0], score = -1;
  for (const s of a.stances) { const c = s.kw.filter((k) => text.includes(k)).length; if (c > score) { score = c; best = s; } }
  return best;
}

export function ruleAnalyze(a: Article, level: Level, text: string, personaIndex: number) {
  const sents = sentences(text);
  const stance = level === 'choshi' ? null : detectStance(a, text);
  const claim = (stance && sents.find((s) => has(s, stance.kw))) || sents[0] || '';
  const reasons = sents.filter((s) => s !== claim && (has(s, EVID) || /\d/.test(s))).slice(0, 2);
  const rest = sents.filter((s) => s !== claim && !reasons.includes(s));
  while (reasons.length < 2 && rest.length) reasons.push(rest.shift()!);
  const premise = stance ? stance.premise : a.choshiPremise;
  const w: { type: string; detail: string; question: string }[] = [];
  if (!sents.some((s) => has(s, EVID) || /\d/.test(s))) w.push({ type: '근거 부족', detail: '주장을 받치는 사례나 자료가 보이지 않습니다.', question: '이 주장이 맞다는 걸 보여 줄 사례를 하나 든다면 무엇입니까?' });
  w.push({ type: '숨은 전제', detail: `이 글은 "${premise}"는 생각 위에 서 있지만, 글에는 드러나 있지 않습니다.`, question: stance ? stance.premiseQ : a.choshiQ });
  const hedged = sents.find((s) => has(s, HEDGE));
  if (hedged) w.push({ type: '추측으로 끝난 근거', detail: `"${hedged}" 문장이 추측으로 끝나서 근거로 쓰기 어렵습니다.`, question: '이 부분을 확신하려면 어떤 사실이 필요합니까?' });
  if (!has(text, CONCEDE)) w.push({ type: '반례를 다루지 않음', detail: '반대쪽에서 나올 만한 반례를 다루지 않았습니다.', question: '당신의 주장이 틀리는 경우가 있다면 언제입니까?' });
  const bank = stance ? stance.bank : a.choshiBank;
  const r = bank[personaIndex % bank.length];
  return {
    stance: stance ? stance.id : null,
    structure: { claim, reasons, premise },
    weaknesses: w.slice(0, LEVELS[level].weak),
    rebuttal: { persona: r.p, text: r.t, question: r.q, source: r.src != null ? { line: r.src + 1, text: a.summary[r.src] } : null },
  };
}
