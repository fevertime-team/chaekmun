// index.html 안의 PERSONAS, ARTICLES, LEVELS, RUBRIC 를 뽑아 server/content.json 으로 저장합니다.
// 화면(index.html)이 데이터의 원본입니다. 기사 본문(body)이나 시드 답안을 고친 뒤에는 꼭 다시 실행하세요.
//   node scripts/extract-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pick = (start, end) => {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error(`데이터 구간을 찾지 못했습니다: ${start}`);
  return html.slice(a, b);
};
const code = [
  pick('const PERSONAS', 'const LEVELS'),
  pick('const LEVELS', '/* 데모 계정'),
  pick('const RUBRIC=', 'const RUBRIC_SRC'),
  ';globalThis.__out={PERSONAS,ARTICLES,LEVELS,RUBRIC};',
].join('\n');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(code, ctx);
const { PERSONAS, ARTICLES, LEVELS, RUBRIC } = ctx.__out;

// 서버에 필요한 칸만 남깁니다 (예비 반론 bank 는 캐시가 없을 때 쓰는 마지막 대체 수단으로 남김)
const articles = ARTICLES.map((a) => ({
  id: a.id, field: a.field, title: a.title, source: a.source, url: a.url,
  summary: a.summary, body: Array.isArray(a.body) && a.body.length ? a.body : null,
  personas: a.personas, q: a.q,
  stances: a.stances.map((s) => ({ id: s.id, label: s.label, kw: s.kw, premise: s.premise, premiseQ: s.premiseQ, bank: s.bank })),
  choshiPremise: a.choshiPremise, choshiQ: a.choshiQ, choshiBank: a.choshiBank,
  samples: a.samples, revised: a.revised,
  clusters: a.clusters.map((c, i) => ({ i, label: c.label, stance: c.stance, tam: !!c.tam, text: c.s.text })),
}));
const out = { generatedAt: new Date().toISOString(), personas: PERSONAS, levels: LEVELS, rubric: RUBRIC, articles };
writeFileSync(new URL('../server/content.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(`기사 ${articles.length}개, 페르소나 ${Object.keys(PERSONAS).length}명, 본문 있는 기사 ${articles.filter((a) => a.body).length}개`);
