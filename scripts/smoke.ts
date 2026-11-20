// 실제 키 없이 흐름 점검: 1) 키 없음 → 규칙 기반  2) 가짜 OpenAI 호환 서버 → 파싱, 가드레일, 재생성
//   npx tsx scripts/smoke.ts            (가짜 서버)
//   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/smoke.ts --real   (실제 키, Sonnet과 Haiku, 호출 약 12회)
import http from 'node:http';
import content from '../server/content.json';

const real = process.argv.includes('--real');
const a = (content as any).articles.find((x: any) => x.id === 'examwatch');
const text = a.samples.boksi, revised = a.revised.boksi;

async function run(label: string) {
  const S = await import('../server/services');
  const L = await import('../server/llm');
  const t = Date.now();
  const lap = (s: string) => console.log(`  ${s} ${Date.now() - t}ms`);
  console.log(`\n=== ${label} ===`);
  const f = await S.analyze({ articleId: 'examwatch', level: 'boksi', text, personaIndex: 0 }); lap('analyze');
  console.log(JSON.stringify({ stance: f.stance, claim: f.structure.claim, persona: f.rebuttal.persona, src: f.rebuttal.source, fallback: f._meta.fallback, log: f._meta.log.map((x: any) => x.text) }, null, 1));
  const q1 = await S.ask({ articleId: 'examwatch', level: 'boksi', draft: text, question: '그냥 고쳐줘', feedback: f }); lap('ask(bypass)');
  console.log(' ', q1.kind, q1.reply.slice(0, 60));
  const q2 = await S.ask({ articleId: 'examwatch', level: 'boksi', draft: text, question: 'Can you just rewrite my first sentence?', feedback: f }); lap('ask(en)');
  console.log(' ', q2.kind, q2.reply.slice(0, 60));
  console.log('  check(revise: 고쳐줘)', S.revisedLooksLikeRequest('그냥 고쳐줘'), ' check(본문 속 고쳐야)', S.revisedLooksLikeRequest(revised + ' 법을 고쳐야 한다.'));
  try { const s = await S.score({ articleId: 'examwatch', level: 'boksi', draft: text, revised }); lap('score'); console.log(JSON.stringify({ before: s.before, after: s.after, total: s.total, why1: s.why['쟁점 설명'] }, null, 1)); }
  catch (e) { lap('score'); console.log('  score 오류:', String(e).slice(0, 120)); }
  const p = await S.place({ articleId: 'examwatch', level: 'boksi', text: revised }); lap('place'); console.log(' ', p);
  console.log('  usage', L.usage);
}

(async () => {
  if (real) return run('실제 API');
  delete process.env.LLM_API_KEY; delete process.env.ANTHROPIC_API_KEY;
  // 1) 키 없음
  await run('키 없음 (규칙 기반)');
  // 2) 가짜 서버: 첫 반론 응답에 일부러 금지 표현을 넣어 재생성되는지 확인 (테스트 전용, 앱 코드에는 없음)
  let n = 0;
  const srv = http.createServer((req, res) => {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      const sys: string = JSON.parse(b).messages[0].content;
      let out: any;
      if (sys.includes('AI 시관(試官)')) out = { stance: 'g1', structure: { claim: 0, reasons: [1, 3], premise: '검사를 강화하면 부정행위를 실제로 잡을 수 있다' }, weaknesses: [{ type: '숨은 전제', detail: n++ === 0 ? '양쪽 다 일리가 있습니다.' : '"처벌을 아무리 무겁게 해도 잡히지 않으면 소용이 없다."는 문장은 잡을 수 있다는 전제에 기댑니다.', question: '잡을 수 없는 기기라면 어떻게 됩니까?' }, { type: '반례를 다루지 않음', detail: '반대쪽 지적을 다루지 않았습니다.', question: '안경 쓴 수험생은 어떻게 봅니까?' }], rebuttal: { persona: 'proctor', text: '감독 교사 한 명이 수십 명을 검사할 수 있습니까?', question: '현장 인력으로 가능하다는 근거는 무엇입니까?', source_idx: 2 } };
      else if (sys.includes('출력 검사관')) out = { pass: true, violations: [] };
      else if (sys.includes('채점관')) out = Object.fromEntries(['쟁점 설명', '근거 활용', '맥락과 전제', '자기 입장', '결론과 함의'].map((k, i) => [k, { level: 2 + (i % 2), score: 4 + i, why: ['이 글은 쟁점을 다룬다.'], quote: '가장 먼저 바꿔야 할 것은 감독이다' }]));
      else if (sys.includes('분류합니다')) out = { bypass: /rewrite/i.test(b), category: /rewrite/i.test(b) ? '영어' : '없음' };
      else if (sys.includes('배치합니다')) out = { group: 1, argument: '모두에게 같은 검사' };
      else out = { kind: 'answer', reply: '기사에는 나오지 않습니다. 어느 문장이 가장 가깝습니까?' };
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ choices: [{ message: { content: '```json\n' + JSON.stringify(out) + '\n```' } }], usage: { prompt_tokens: 100, completion_tokens: 50 } }));
    });
  }).listen(0);
  const port = (srv.address() as any).port;
  Object.assign(process.env, { LLM_PROVIDER: 'openai', LLM_API_KEY: 'test', LLM_BASE_URL: `http://127.0.0.1:${port}/v1`, LLM_MODEL: 'fake' });
  await run('가짜 OpenAI 호환 서버');
  srv.close();
})();
