// 11/19 기사 5편, 시드 150편, 관점 지도를 index.html 의 기존 데이터 형식으로 바꿔 넣습니다.
//   node scripts/import-1119.mjs && npm run data
// 원본: yumin/1119/articles_1119.json, seeds_1119.json, perspective_map_1119.json (유민)
// 유민 파일에 자리가 없는 칸(입장 키워드, 숨은 전제, 예비 반론, 고친 예시, 전시 질문, 과제 힌트, 전문가 페르소나 카드)은
// 아래 EXTRA 에 형준(Claude)이 채웠습니다. 예비 반론(bank)은 API가 실패할 때만 보이고, 실제 모드에서는 Claude가 새로 씁니다.
// 유민이 JSON을 고치면(정치 기사 제목·주소 등) 이 스크립트를 다시 돌리면 됩니다. 몇 번을 돌려도 결과가 같습니다.
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const rd = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const A = Object.values(rd('yumin/1119/articles_1119.json'));
const M = Object.values(rd('yumin/1119/perspective_map_1119.json'));
const SD = Object.values(rd('yumin/1119/seeds_1119.json'));
// 기사 원문 (시연용 기사 5편 원문.docx 를 분야별로 나눈 것): { 정치: {url, title, body:[문단...]}, ... }
const BODIES = rd('yumin/1119/articles_body_1119.json');
// 기사 사진 (형준이 받은 순서: 정치, 경제, 사회, 교육, 과학기술). 출처는 기사 언론사로 표기, 정확한 사진 출처는 유민 확인
const PHOTOS = {
  filibuster: { src: 'img/articles/filibuster.webp', credit: '사진: 뉴시스' },
  chinafta: { src: 'img/articles/chinafta.png', credit: '자료: 한국거래소 (파이낸셜뉴스 기사 표)' },
  subway: { src: 'img/articles/subway.png', credit: '사진: 경향신문 기사' },
  examwatch: { src: 'img/articles/examwatch.png', credit: '사진: 한겨레 기사' },
  aicsat: { src: 'img/articles/aicsat.webp', credit: '사진: 중앙일보 기사' },
};
// 유민 guard_note 를 바꾸는 곳. subway: "25일 총파업은 19일 기사 본문에서 확인되기 전 인용 금지"였는데, 원문 docx 의 19일 경향신문 본문에 들어 있음
const GUARD_OVERRIDE = {
  subway: '25일 무기한 총파업 예고는 19일 기사 본문에 있는 내용이므로 인용할 수 있다. 다만 파업 찬반이 아니라 안전 인력 비용을 누가 낼지라는 질문에 맞춰 다룬다.',
};
// 오늘의 과제 "이 기사에서는" 힌트 (유민 FEVERTIME_TASK_HINT_1119.md 안의 JSON). 바깥 키 "<교육 기사 id>" → 분야 이름으로 기사를 찾음
const HINTS = (() => {
  const md = readFileSync(new URL('yumin/1119/FEVERTIME_TASK_HINT_1119.md', root), 'utf8');
  const m = md.match(/```json\s*([\s\S]*?)```/);
  if (!m) throw new Error('TASK_HINT md 에서 JSON 을 찾지 못함');
  const raw = JSON.parse(m[1]);
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.replace(/^<|\s*기사 id>$/g, '').trim(), v])); // { 교육: {...}, 과학기술: {...} }
})();

/* ---------- 유민 id → 화면 id ---------- */
const ID = {
  politics_filibuster: 'filibuster',
  economy_china_fta: 'chinafta',
  society_subway: 'subway',
  education_exam_surveillance: 'examwatch',
  scitech_ai_csat: 'aicsat',
};
const DEMO_ARTICLE = 'examwatch'; // "예시 답안으로 체험하기" 기본 기사 (이전 aiexam 자리)
const COMMON = { '경제학자': 'econ', '현장 노동자': 'labor', '법조인': 'law', '소상공인': 'shop', '교육자': 'edu', '엔지니어': 'eng', '시민·소비자': 'citizen', '행정 실무자': 'admin', '미래 세대': 'future', '소외된 당사자': 'margin' };

/* ---------- 전문가 페르소나 카드 (유민: 이름과 focus / 형준: mark, desc, asks, tone) ---------- */
const EXPERTS = {
  '국회 입법조사관': { key: 'researcher', mark: '議', desc: '제도가 실제로 어떻게 작동했는지 기록으로 보는 관점', asks: ['그 제도가 실제로 쓰였을 때 기록에는 무엇이 남았습니까?', '규칙을 바꾸면 의사 진행에서 무엇이 먼저 달라집니까?'], tone: '기록과 절차를 차분히 짚는 말투' },
  '소수 정당 보좌관': { key: 'aide', mark: '補', desc: '의석이 적은 쪽에서 국회를 보는 관점', asks: ['그 수단이 사라지면 소수에게는 무엇이 남습니까?', '그 규칙을 다수가 정해도 공정합니까?'], tone: '현장의 절박함이 담긴 직설적인 말투' },
  '콘텐츠 제작사 PD': { key: 'pd', mark: '劇', desc: '제작 현장에서 시장을 보는 관점', asks: ['그 약속이 제작 일정에서는 어떻게 작동합니까?', '기다리는 동안 제작진은 무엇으로 버팁니까?'], tone: '일정과 예산을 구체적으로 말하는 말투' },
  '통상 협상 실무자': { key: 'trade', mark: '約', desc: '합의문이 실제로 지켜지는지를 보는 관점', asks: ['합의가 지켜지지 않으면 무엇에 기댈 수 있습니까?', '약속된 것과 빠진 것을 구분했습니까?'], tone: '조문을 정확히 따지는 신중한 말투' },
  '지하철 기관사': { key: 'driver', mark: '車', desc: '운전석에서 운행을 보는 관점', asks: ['규정을 다 지키면 운행은 실제로 어떻게 바뀝니까?', '평소의 빠른 운행은 무엇을 건너뛰고 있었습니까?'], tone: '현장 경험을 담담하게 말하는 말투' },
  '휠체어를 쓰는 교통약자': { key: 'wheel', mark: '輪', desc: '역 안의 도움이 없으면 이동이 막히는 사람의 관점', asks: ['역 직원이 줄면 나는 누구에게 도움을 청합니까?', '빠른 운행과 안전한 이동 중 누구를 기준으로 정했습니까?'], tone: '구체적인 하루를 들려주는 단호한 말투' },
  '수능 감독 교사': { key: 'proctor', mark: '監', desc: '시험장 안에서 실제로 감독하는 사람의 관점', asks: ['감독 교사 한 명이 그 검사를 실제로 해낼 수 있습니까?', '현장에서 놓치면 그 책임은 누가 집니까?'], tone: '현장의 부담을 담담하게 말하는 말투' },
  '수험생 학부모': { key: 'parent', mark: '親', desc: '정직하게 준비한 아이의 하루를 보는 관점', asks: ['정직하게 준비한 아이가 그날 겪는 부담은 누가 덜어 줍니까?', '그 규칙이 내 아이에게도 공정합니까?'], tone: '걱정이 담겼지만 또렷한 말투' },
  '대학 입학사정관': { key: 'admiss', mark: '選', desc: '점수로 학생을 고르는 현장의 관점', asks: ['그 점수는 학생에 대해 무엇을 알려 줍니까?', '점수가 같은 두 학생을 무엇으로 구분합니까?'], tone: '선발 경험을 바탕으로 신중하게 묻는 말투' },
  'AI 연구자': { key: 'airesearch', mark: '智', desc: 'AI가 무엇을 잘하고 못하는지 보는 관점', asks: ['AI가 그 문제를 푼 방식과 사람이 푼 방식은 무엇이 다릅니까?', '내년의 AI에도 그 대책이 통합니까?'], tone: '정확하고 담백한 말투' },
};

/* ---------- 기사별 보충 (형준) ---------- */
// (과제 힌트는 유민 FEVERTIME_TASK_HINT_1119.md 에서 읽음)
// title: 화면의 시제 제목 (유민 문서의 소제목). pressTitle 은 유민 JSON 의 기사 제목
// stances: 관점 지도 그룹 g1~g6 과 같은 순서. kw 는 목업(규칙) 모드의 입장 판별용, premise/premiseQ/bank 는 API 실패 시 예비 응답
const EXTRA = {
  filibuster: {
    title: '다수가 원하는 법, 소수는 얼마나 늦출 수 있어야 할까',
    jeonsi: '제시문을 바탕으로, 다수결의 효율과 소수 의견 보호를 함께 고려한 국회 무제한 토론 제도를 설계하라.',
    stances: [
      { kw: ['유지', '지금처럼', '방패', '유일', '마지막', '기록'], premise: '시간을 끄는 것이 소수가 반대 이유를 알릴 수 있는 유일한 수단이다', premiseQ: '언론, 상임위원회 토론, 다음 선거처럼 반대를 알릴 다른 통로가 있다면 이 주장은 어떻게 됩니까?',
        bank: [{ p: 'researcher', t: '무제한 토론이 길어질수록 실제 발언 내용이 안건과 멀어지는 경우도 기록에 남습니다. 늘어난 시간이 곧 설명이었다고 볼 수 있습니까?', q: '지연된 시간이 국민에게 반대 이유를 알리는 데 실제로 쓰였다는 근거는 무엇입니까?', src: 1 }] },
      { kw: ['상한', '시간 제한', '횟수', '제한', '정해', '최소 시간', '끝없'], premise: '정해진 시간 안에서도 소수가 반대 이유를 충분히 설명할 수 있다', premiseQ: '안건이 복잡해 정해진 시간으로는 설명이 모자란다면 어떻게 합니까?',
        bank: [{ p: 'aide', t: '시간 상한을 누가 정하느냐가 문제입니다. 상한을 다수당이 정한다면, 소수에게 남는 시간은 다수가 허락한 만큼 아닙니까?', q: '상한을 정하는 권한이 다수에게 있을 때도 이 제도가 소수를 보호한다고 봅니까?' }] },
      { kw: ['선별', '일괄', '모든 안건', '방해', '중요한 안건', '골라'], premise: '어떤 안건이 무제한 토론을 쓸 만큼 중요한지 공정하게 가를 수 있다', premiseQ: '무엇이 중요한 안건인지 다수와 소수의 판단이 다르면, 그 기준은 누가 정합니까?',
        bank: [{ p: 'law', t: '쓸 수 있는 안건을 제한하려면 그 기준이 법에 미리 적혀 있어야 합니다. 기준을 정하는 순간 다수가 자기에게 유리하게 쓸 수 있지 않습니까?', q: '중요한 안건과 그렇지 않은 안건을 가르는 기준을 한 문장으로 적을 수 있습니까?', src: 1 }] },
      { kw: ['다수결', '선거', '폐지', '축소', '민의', '결정을 존중'], premise: '선거로 정해진 다수의 결정이 곧 국민 다수의 뜻이다', premiseQ: '선거 때는 다수였어도 특정 법안에 대한 여론은 다를 수 있다면, 다수결은 무엇을 대표합니까?',
        bank: [{ p: 'margin', t: '다수결로 빨리 결정하면 목소리가 작은 사람의 사정은 표결 전에 한 번도 다뤄지지 않을 수 있습니다. 그 사람들은 어디서 말할 수 있습니까?', q: '다수결을 앞세운 제도에서 소수의 사정이 다뤄지는 단계는 정확히 어디입니까?' }] },
      { kw: ['합의', '협상', '상정 전', '수정안', '절차', '앞 단계', '의무'], premise: '상정 전에 협상 절차를 두면 양측이 실제로 합의에 이를 수 있다', premiseQ: '협상을 의무로 해도 끝내 합의가 안 되면, 그다음에는 무엇이 결정을 내립니까?',
        bank: [{ p: 'admin', t: '협상 절차를 의무로 두면 그 기간만큼 다른 안건 처리도 늦어집니다. 지연을 앞 단계로 옮기는 것일 뿐이지 않습니까?', q: '합의 절차가 무제한 토론보다 시간을 덜 쓴다고 보는 근거는 무엇입니까?', src: 2 }] },
      { kw: ['공개 설명', '관련된', '발언 내용', '설명', '안건과 관련', '질의'], premise: '발언을 안건과 관련된 내용으로 묶으면 지연 효과는 줄고 견제 효과는 남는다', premiseQ: '관련성을 누가 판단하느냐에 따라 발언이 막힐 수 있다면, 이 제도는 여전히 소수의 방패가 됩니까?',
        bank: [{ p: 'researcher', t: '발언이 안건과 관련 있는지 판단하는 일은 의장에게 맡겨지기 쉽습니다. 그 판단이 한쪽으로 기울 때 막을 장치가 있습니까?', q: '관련성 판단을 누가, 어떤 기준으로 하게 하겠습니까?' }] },
    ],
    choshiPremise: '발언을 길게 이어 가는 것은 반대 이유를 알리기 위한 것이다',
    choshiQ: '발언이 반대 이유와 상관없는 내용으로 채워진다면, 그래도 정당한 반대라고 보겠습니까?',
    choshiBank: [
      { p: 'citizen', t: '안건이 늦어지면 그 결정을 기다리던 다른 학생들의 일정도 함께 밀립니다. 기다리는 쪽의 사정은 어떻게 봅니까?', q: '표결을 늦추는 동안 손해를 보는 사람은 누구입니까?' },
      { p: 'margin', t: '소수가 발언을 길게 하지 못하면, 과반이 한 번도 듣지 않은 사정은 그대로 묻힐 수 있습니다. 그 소수가 다른 방법으로 말할 수 있습니까?', q: '과반이 소수의 말을 듣게 만드는 다른 방법이 있다면 무엇입니까?' },
    ],
    sampleChoshi: '소수가 발언을 길게 하는 건 정당한 반대 방법이라고 본다. 과반이라고 해서 항상 옳은 건 아니기 때문이다. 소수 의견도 들어야 한다.',
    revisedChoshi: '소수가 발언을 길게 이어 가는 것은 반대 이유를 알리는 데 쓰일 때만 정당하다고 본다. 과반의 결정이 늘 옳은 것은 아니고, 표결 전에 소수의 사정이 한 번은 다뤄져야 하기 때문이다. 물론 발언이 안건과 상관없는 내용으로 채워지면 그건 반대가 아니라 방해다. 그래서 발언 시간은 인정하되, 그 시간에 반대 이유를 설명한다는 조건이라면 받아들이겠다.',
    revisedBoksi: '필리버스터는 남기되 법안마다 쓸 수 있는 시간에 상한을 둬야 한다. 기사에 따르면 이번 대치로 내년도 예산안 처리 일정까지 영향을 받을 수 있다는 관측이 나왔다. 무제한 토론이 한 법안에 묶이면 다른 안건 논의가 함께 멈추는 셈이다. 물론 시간이 정해지면 복잡한 법안은 설명이 모자랄 수 있다는 반론이 있다. 그래서 상한은 그때그때 다수당이 정하지 않고 법에 미리 정해 두되, 법안 분량에 따라 시간을 늘릴 수 있게 해야 한다. 그러면 소수는 반대 이유를 설명할 시간을 보장받고, 국회 전체는 끝없는 지연을 피할 수 있다.',
  },
  chinafta: {
    title: '다시 열리는 중국 시장, 얼마나 기대야 할까',
    jeonsi: '제시문을 바탕으로, 중국 시장의 기회를 살리면서 정치적 의존 위험을 관리할 수 있는 콘텐츠 기업의 진출 전략을 제시하라.',
    stances: [
      { kw: ['적극', '선점', '빠르게', '지금 들어가', '먼저 들어가', '기회'], premise: '지금 먼저 들어간 기업이 시장이 열린 뒤에도 앞서 나간다', premiseQ: '먼저 들어간 기업이 오히려 다음 규제의 첫 대상이 된다면, 선점은 무엇을 남깁니까?',
        bank: [{ p: 'trade', t: '이번 합의에서도 K팝 공연 재개는 빠졌습니다. 약속된 분야와 실제로 열린 분야가 다를 때, 빠르게 들어간 기업은 무엇에 기댈 수 있습니까?', q: '합의가 지켜지지 않을 때 먼저 들어간 기업이 입는 손해는 누가 감당합니까?', src: 2 }] },
      { kw: ['분산', '다른 시장', '동남아', '균형', '한 시장', '의존을 피'], premise: '다른 시장에서도 중국만큼의 성과를 낼 수 있다', premiseQ: '다른 시장의 규모가 중국보다 훨씬 작다면, 분산은 어떤 비용을 치르게 합니까?',
        bank: [{ p: 'econ', t: '분산하면 위험은 줄지만 한 시장에 집중했을 때 얻는 규모의 이익도 줄어듭니다. 그 손실이 줄어든 위험보다 작다고 볼 수 있습니까?', q: '분산이 집중보다 낫다고 판단할 기준은 무엇입니까?' }] },
      { kw: ['단계', '확인', '천천히', '신중', '실제 허가', '지켜보'], premise: '천천히 들어가도 잃는 기회가 크지 않다', premiseQ: '경쟁 기업이 먼저 자리를 잡아 버리면, 확인하고 들어갈 자리가 남아 있습니까?',
        bank: [{ p: 'pd', t: '공동제작은 기획부터 방영까지 몇 년이 걸립니다. 확인이 끝날 때까지 기다리면 그 자리는 다른 나라 제작사가 먼저 채우지 않겠습니까?', q: '단계적으로 들어갈 때 놓치는 기회를 당신의 주장은 어떻게 다룹니까?', src: 1 }] },
      { kw: ['의존', '위험', '정치', '다시 막', '한한령', '보복'], premise: '정치 상황이 바뀌면 시장은 예전처럼 다시 닫힌다', premiseQ: '이번 합의처럼 제도적 약속이 생겼다면, 예전과 같은 방식으로 다시 닫힐 가능성도 같습니까?',
        bank: [{ p: 'labor', t: '진출 속도를 늦추면 이번 상한가에 기대를 건 회사의 채용 계획도 함께 늦춰집니다. 그 사이 일하는 사람의 생계는 누가 책임집니까?', q: '위험을 피하는 동안 생기는 비용은 누가 지게 됩니까?', src: 0 }] },
      { kw: ['정부', '보증', '보험', '분담', '작은 기업', '함께 나누'], premise: '정부가 위험을 나눠 지면 작은 기업도 실제로 도전하게 된다', premiseQ: '정부가 손실을 덮어 준다면, 기업이 위험을 덜 따지고 무리하게 들어가지는 않겠습니까?',
        bank: [{ p: 'citizen', t: '정치적 위험을 정부가 나눠 진다는 건 결국 세금으로 기업 손실을 메운다는 뜻입니다. 콘텐츠와 상관없는 시민도 그 비용을 내야 합니까?', q: '정부가 나눠 질 위험과 기업이 질 위험의 경계를 어디에 긋겠습니까?' }] },
      { kw: ['규칙', '비차별', '최혜국', '차별 금지', '협정', '분쟁'], premise: '합의문의 규칙은 실제로 집행될 수 있다', premiseQ: '규칙을 어겨도 실제로 문제 삼기 어렵다면, 규칙을 쓰는 능력은 무엇을 지켜 줍니까?',
        bank: [{ p: 'trade', t: '비차별 심사를 약속해도 심사가 늦어지는 것만으로 사업은 멈출 수 있습니다. 규칙을 어겼다고 증명하기 어려운 방식이라면 어떻게 합니까?', q: '규칙 위반을 확인하고 바로잡는 동안 기업이 버틸 수 있습니까?', src: 1 }] },
    ],
    choshiPremise: '정치 상황에 따라 막혔던 시장도 지금은 다시 열렸다',
    choshiQ: '몇 년 뒤 시장이 다시 막힌다면, 그 회사에서 쌓은 경력은 어떻게 됩니까?',
    choshiBank: [
      { p: 'future', t: '첫 직장에서 쌓은 경력은 10년 뒤 진로를 좌우합니다. 그 시장이 다시 막히면 그 경력은 어디서 인정받을 수 있습니까?', q: '시장이 닫혀도 남는 능력이 무엇인지 말할 수 있습니까?' },
      { p: 'shop', t: '큰 회사는 시장이 막혀도 버티지만, 작은 회사는 한 번 막히면 문을 닫기도 합니다. 당신이 들어갈 회사는 어느 쪽입니까?', q: '회사의 규모에 따라 당신의 답이 달라집니까?' },
    ],
    sampleChoshi: '중국 시장에 도전하겠다. 시장이 크니까 기회도 클 것 같다. 젊을 때 도전해 보는 게 좋다.',
    revisedChoshi: '그 회사에 들어가 중국 시장에 도전하겠다. 기사에 따르면 중국은 한국 영화와 게임에 최혜국 대우를 약속하고 공동제작 대상도 넓혔다. 물론 K팝 공연이 합의에서 빠졌듯이 다시 막힐 위험은 남아 있다. 그래서 시장이 막혀도 다른 나라에서 쓸 수 있는 공동제작 경험을 쌓는다는 조건이라면 도전할 가치가 있다고 본다.',
    revisedBoksi: '중국 시장 확대는 실제 허가가 확인되는 만큼 단계적으로 늘려야 한다. 기사에 따르면 이번 합의로 영화와 게임은 최혜국 대우를 받게 됐지만 K팝 공연 재개는 빠졌고, 제도적 근거와 실제 사업 허가는 별개라는 신중론도 나왔다. 약속과 실제 허가가 다를 수 있다면 큰돈을 먼저 쓰는 것은 위험하다. 물론 천천히 들어가면 먼저 들어간 경쟁 기업에 자리를 내줄 수 있다는 반론이 있다. 그래서 공동제작처럼 합의문에 적힌 분야에는 바로 들어가고, 빠진 분야는 허가가 나는 대로 늘려야 한다. 그러면 선점 기회는 살리면서 다시 막힐 때의 손해는 줄일 수 있다.',
  },
  subway: {
    title: '안전 인력과 내 출근길, 무엇이 먼저일까',
    jeonsi: '제시문을 바탕으로, 지하철 안전 인력 확충 비용을 시민, 이용자, 운영 기관이 나누어 부담하는 방안을 설계하라.',
    stances: [
      { kw: ['세금', '공공', '예산', '기반 시설', '공공 시설', '재정'], premise: '노조가 요구한 인력이 모두 안전에 꼭 필요하다', premiseQ: '요구한 인력 중 일부만 안전과 직접 관련이 있다면, 세금으로 낼 몫은 어떻게 정합니까?',
        bank: [{ p: 'econ', t: '세금으로 내면 지하철을 타지 않는 시민도 비용을 냅니다. 쓰는 사람과 내는 사람이 다를 때, 운영 기관이 비용을 아낄 이유는 남아 있습니까?', q: '세금으로 지원하면서도 운영 효율을 지키게 할 장치는 무엇입니까?', src: 2 }] },
      { kw: ['요금', '이용자', '수익자', '인상', '할인', '타는 사람'], premise: '요금을 조금 올려도 이용자는 지하철을 계속 탄다', premiseQ: '요금이 오르자 일부가 버스나 자가용으로 옮긴다면, 늘어난 수입으로 인력 비용을 감당할 수 있습니까?',
        bank: [{ p: 'margin', t: '할인을 둔다 해도 할인 기준에서 조금 벗어난 사람은 오른 요금을 고스란히 냅니다. 그 경계에 선 사람은 어떻게 합니까?', q: '요금 인상의 부담이 가장 무겁게 떨어지는 사람은 누구입니까?' }] },
      { kw: ['규정', '준법', '안전 기준', '정상', '지키면', '늦어지는'], premise: '규정을 지키면 열차가 늦어진다는 사실이 곧 인력이 부족하다는 증거다', premiseQ: '지연의 원인이 인력이 아니라 배차나 설비 문제라면, 이 주장은 어떻게 됩니까?',
        bank: [{ p: 'driver', t: '규정대로 정차 시간을 지키면 늦어지는 건 사실이지만, 그게 모두 사람이 모자라서는 아닙니다. 배차 간격이 처음부터 빠듯하게 짜여 있다면 어떻게 봅니까?', q: '지연이 인력 부족 때문이라는 것을 무엇으로 확인하겠습니까?', src: 1 }] },
      { kw: ['효율', '재배치', '감축', '구조조정', '내부', '낭비'], premise: '내부 효율화로 필요한 안전 인력을 상당 부분 마련할 수 있다', premiseQ: '재배치할 인력이 이미 다른 안전 업무를 맡고 있다면, 효율화로 무엇을 줄입니까?',
        bank: [{ p: 'wheel', t: '역 직원이 줄면 엘리베이터가 멈췄을 때 도와줄 사람부터 사라집니다. 효율화로 줄어드는 자리가 누구에게 가장 크게 느껴지는지 생각해 봤습니까?', q: '효율화 계획에서 교통약자의 이동은 어떻게 지켜집니까?' }] },
      { kw: ['기술', '자동화', '센서', '로봇', 'AI', '기계'], premise: '반복 점검을 기술에 맡기면 사람이 맡던 위험이 줄어든다', premiseQ: '기술이 고장 나거나 놓친 문제를 확인할 사람이 없다면, 위험은 정말 줄어듭니까?',
        bank: [{ p: 'labor', t: '기계가 점검을 맡아도 그 기계를 점검하고 고치는 일은 사람이 합니다. 위험 작업을 2인 1조로 하자는 요구는 그 사람의 안전을 말하는 것 아닙니까?', q: '기술을 들인 뒤에도 남는 위험 작업은 누가, 몇 명이 맡게 됩니까?', src: 1 }] },
      { kw: ['검증', '독립', '산정', '숫자', '객관', '제3'], premise: '독립 기관이 산정한 숫자는 노사 모두가 받아들인다', premiseQ: '독립 기관의 숫자도 한쪽이 받아들이지 않는다면, 그다음 결정은 누가 합니까?',
        bank: [{ p: 'admin', t: '독립 기관이 필요 인력을 산정하려면 몇 달이 걸립니다. 그동안 준법투쟁과 지연이 이어진다면 시민은 무엇을 기다리는 것입니까?', q: '검증이 끝날 때까지의 운행은 어떻게 하겠습니까?', src: 2 }] },
    ],
    choshiPremise: '안전 규정을 지키느라 늦어지는 것은 잠깐이다',
    choshiQ: '지연이 몇 주씩 이어져 지각이 반복된다면, 그래도 받아들이겠습니까?',
    choshiBank: [
      { p: 'citizen', t: '통학이 10분 늦어지면 첫 수업이나 아르바이트에 늦는 사람도 생깁니다. 그 손해는 누가 메워 줍니까?', q: '지연이 길어질 때 받아들일 수 있는 한계는 어디입니까?' },
      { p: 'driver', t: '규정대로 운행하면 늦어진다는 건, 평소에는 규정을 다 지키지 못하고 있었다는 뜻이기도 합니다. 평소의 빠른 운행이 무엇을 건너뛰고 있었는지 생각해 봤습니까?', q: '평소의 빠름과 규정대로의 느림 중 어느 쪽이 정상이라고 봅니까?', src: 1 },
    ],
    sampleChoshi: '준법투쟁을 받아들이겠다. 안전이 중요하니까 조금 늦어도 괜찮다. 다들 이해할 것 같다.',
    revisedChoshi: '내 통학이 늦어지더라도 이 준법투쟁은 받아들이겠다. 기사에 따르면 기관사는 속도를 높이거나 정차 시간을 줄이지 않을 뿐이고, 이는 원래 지켜야 할 안전 규정이다. 물론 지연이 몇 주씩 이어지면 지각과 결석이 쌓이는 학생도 생긴다. 그래서 공사가 혼잡역에 인력을 보내는 것처럼 지연을 줄이는 조치를 함께 한다는 조건에서 받아들이겠다.',
    revisedBoksi: '지하철 안전 인력을 늘리는 비용은 세금으로 내야 한다. 지하철이 멈추면 타지 않는 시민의 출근과 물류까지 함께 막히므로, 지하철은 도시 전체가 기대는 기반 시설이다. 요금을 올리면 학생처럼 여유가 없는 이용자가 가장 큰 부담을 진다. 물론 노조가 요구한 1313명이 모두 안전에 꼭 필요한지는 따져 봐야 한다는 반론이 있다. 그래서 세금은 안전과 직접 관련된 인력에만 쓰고, 그 규모는 따로 검증해야 한다. 그러면 세금을 내는 시민도 그 돈이 어디에 쓰이는지 확인할 수 있다.',
  },
  examwatch: {
    title: '공정한 시험을 위해, 감시는 어디까지 괜찮을까',
    jeonsi: '제시문을 바탕으로, 수험생의 부담을 줄이면서 스마트 기기 부정행위를 막는 수능 관리 방안을 제시하라.',
    stances: [
      { kw: ['한 명', '기회를 빼앗', '감수', '강화', '진로', '모두의 피해'], premise: '적발된 수험생은 모두 부정행위를 하려는 의도가 있었다', premiseQ: '휴대전화를 깜빡 잊고 내지 않은 수험생도 같은 처리를 받는다면, 그 감시는 무엇을 잡아낸 것입니까?',
        bank: [{ p: 'parent', t: '재난문자가 울린 순간 정직하게 시험을 보던 아이도 놀라 집중이 깨졌을 겁니다. 그 아이가 잃은 시간도 공정의 비용에 넣었습니까?', q: '감시를 강화할 때 정직한 수험생이 치르는 비용은 어떻게 계산합니까?', src: 1 }] },
      { kw: ['비례', '최소', '부담이 적은', '정직한 수험생', '과도', '지나치'], premise: '부담이 적은 수단으로도 부정행위를 충분히 막을 수 있다', premiseQ: '부담이 적은 수단으로는 이번 49명을 찾지 못했다면, 비례의 원칙은 어디까지 허용합니까?',
        bank: [{ p: 'proctor', t: '입실 전 확인만으로는 휴대전화를 몸에 숨긴 수험생을 다 찾지 못합니다. 현장에서 쓸 수 있는 부담 적은 수단이 실제로 무엇입니까?', q: '당신이 말하는 부담 적은 수단을 시험실 한 곳에서 어떻게 집행하겠습니까?', src: 1 }] },
      { kw: ['처벌', '위반자', '확실성', '제재', '무효', '적발되면'], premise: '잡힐 수 있다는 것을 알면 처벌이 부정행위를 막는다', premiseQ: '감시를 줄이면 잡힐 가능성도 줄어드는데, 그때도 처벌이 억제력이 됩니까?',
        bank: [{ p: 'law', t: '처벌을 확실히 하려면 먼저 적발이 있어야 하고, 적발은 감시에서 나옵니다. 감시를 줄이면서 처벌의 확실성을 높이는 방법이 있습니까?', q: '감시 없이 위반을 확인할 수 있는 근거는 무엇입니까?', src: 2 }] },
      { kw: ['시험 방식', '구조', '서술', '논술', '평가 방식', '근본'], premise: '시험 방식을 바꾸면 감시가 덜 필요해진다', premiseQ: '서술형이나 논술형 시험에서도 기기로 답을 받을 수 있다면, 감시는 정말 줄어듭니까?',
        bank: [{ p: 'edu', t: '시험 방식을 바꾸는 데는 몇 년이 걸리고, 그동안에도 수능은 해마다 치러집니다. 바뀌기 전까지의 시험은 어떻게 지킵니까?', q: '방식이 바뀌기 전 몇 년 동안의 공정성은 무엇으로 지키겠습니까?' }] },
      { kw: ['같은 규칙', '모두에게', '똑같이', '선별', '일부만', '의심'], premise: '모두가 같은 불편을 겪으면 그 불편은 공정하다', premiseQ: '같은 경보라도 어떤 수험생에게는 훨씬 큰 부담이라면, 그래도 같은 불편입니까?',
        bank: [{ p: 'margin', t: '같은 경보가 울려도 소리에 예민하거나 불안이 큰 수험생에게는 전혀 다른 크기의 부담입니다. 똑같은 규칙이 모두에게 똑같은 불편입니까?', q: '같은 규칙이 누구에게 더 무겁게 떨어지는지 확인했습니까?' }] },
      { kw: ['재난문자', '재난 경보', '경보', '신뢰', '시험장 밖', '국민'], premise: '시험을 위해 재난 경보를 쓰면 재난 경보의 신뢰가 떨어진다', premiseQ: '시민들이 수능 날 경보는 예외로 받아들인다면, 신뢰가 떨어진다는 주장은 어떻게 됩니까?',
        bank: [{ p: 'eng', t: '재난문자는 지역 단위로 보내는 방식이라 시험장 안만 골라 보내기 어렵습니다. 그렇다면 기술적으로 다른 수단이 있는지부터 따져야 하지 않습니까?', q: '재난문자 말고 시험실 안의 휴대전화를 찾을 수 있는 다른 수단은 무엇입니까?', src: 1 }] },
    ],
    choshiPremise: '경보가 울려도 정직한 수험생은 잃는 것이 없다',
    choshiQ: '경보 때문에 놀라 몇 분 동안 집중하지 못했다면, 그것도 잃은 것이 아닙니까?',
    choshiBank: [
      { p: 'parent', t: '시험 도중 휴대전화 경보가 울리면 정직하게 시험을 보던 수험생도 깜짝 놀랍니다. 그 놀람은 누구의 몫입니까?', q: '정직한 수험생이 치르는 비용을 받아들일 만하다고 보는 이유는 무엇입니까?', src: 1 },
      { p: 'proctor', t: '경보가 없었다면 이번에 찾아낸 49명은 그대로 시험을 봤을 겁니다. 그중 누군가 휴대전화를 썼다면 다른 수험생은 무엇을 잃었겠습니까?', q: '경보 없이 같은 수험생을 찾아낼 방법이 있습니까?', src: 1 },
    ],
    sampleChoshi: '경보가 울리는 방식은 받아들이겠다. 부정행위를 막아야 하니까 어쩔 수 없다. 잠깐 놀라는 건 괜찮을 것 같다.',
    revisedChoshi: '시험 도중 경보가 울리는 방식은 조건을 붙여 받아들이겠다. 기사에 따르면 이 방식으로 휴대전화를 내지 않은 수험생 49명을 찾아냈다. 물론 정직하게 시험을 보던 수험생도 경보에 놀라 집중이 깨질 수 있다. 그래서 경보가 울린다는 사실을 시험 전에 미리 알리고, 문제를 푸는 시간을 피해 보낸다면 받아들이겠다.',
    revisedBoksi: '시험의 공정성을 지키기 위해 지금 수준의 감시는 정당하다. 기사에 따르면 이번 수능에서 재난문자로 휴대전화를 내지 않은 수험생 49명을 찾아냈고, 다른 전자기기 소지자도 44명 나왔다. 한 문제로 등급이 갈리는 시험에서 한 명의 부정행위는 다른 수험생의 기회를 빼앗는다. 물론 49명이 모두 부정행위를 하려 한 것은 아니고, 정직한 수험생도 경보에 놀라 집중이 깨질 수 있다는 반론이 있다. 그래서 감시는 지금 수준에서 멈추고, 실제로 기기를 쓴 사람과 깜빡한 사람은 구분해 처리해야 한다. 그래야 감시가 공정을 지키는 수단으로 남는다.',
  },
  aicsat: {
    title: 'AI가 몇 분 만에 만점을 받는 시험, 무엇을 재고 있나',
    jeonsi: '제시문을 바탕으로, 채점의 객관성과 사고 과정 평가를 함께 고려한 AI 시대의 대입 시험 방안을 제시하라.',
    stances: [
      { kw: ['객관식', '객관성', '채점', '납득', '지금 방식', '유지'], premise: '시험장에서 AI 사용을 완벽하게 막을 수 있다', premiseQ: '시험장 보안이 뚫린다면, 객관식 시험의 점수는 여전히 실력을 보여 줍니까?',
        bank: [{ p: 'admiss', t: 'AI가 몇 분 만에 만점을 받는 문제라면, 그 점수로는 학생이 생각하는 힘을 가늠하기 어렵습니다. 객관적인 점수가 무엇을 객관적으로 재고 있는지 물어야 하지 않습니까?', q: '객관식 점수가 사고력을 보여 준다고 보는 근거는 무엇입니까?', src: 0 }] },
      { kw: ['사고 과정', '설명', '판단', '서술', '과정', '풀이'], premise: '사고 과정은 채점자에 따라 크게 흔들리지 않게 평가할 수 있다', premiseQ: '같은 답안에 채점자마다 점수가 다르게 나온다면, 수십만 명이 그 점수를 받아들이겠습니까?',
        bank: [{ p: 'econ', t: '수십만 명의 서술형 답안을 채점하려면 채점자와 비용이 크게 늘어납니다. 그 비용을 감당하면서 같은 기준을 지킬 수 있습니까?', q: '대량 채점에서 일관성은 무엇으로 보장하겠습니까?' }] },
      { kw: ['자격시험', '대학', '자율', '선발', '기초', '전공'], premise: '대학이 자율로 선발해도 공정성이 지켜진다', premiseQ: '대학마다 선발 방식이 달라져 준비 비용이 커진다면, 그 부담은 누구에게 가장 무겁습니까?',
        bank: [{ p: 'margin', t: '대학별로 평가가 달라지면 학원과 정보에 돈을 쓸 수 있는 학생이 유리해집니다. 수능이 지켜 주던 같은 출발선은 어떻게 됩니까?', q: '대학 자율 선발에서 형편이 어려운 학생은 무엇으로 경쟁하게 됩니까?' }] },
      { kw: ['단계', '조금씩', '섞', '서술 문항', '점진', '전환'], premise: '조금씩 섞으면 객관성과 사고력 평가를 함께 얻을 수 있다', premiseQ: '섞어 넣은 서술 문항도 정답 틀을 외우는 식으로 대비된다면, 사고력 평가는 무엇을 남깁니까?',
        bank: [{ p: 'edu', t: '서술 문항을 조금 넣으면 학교와 학원은 곧 그 문항의 모범 틀을 외우게 합니다. 외운 틀로 쓴 답도 사고 과정입니까?', q: '틀을 외운 답과 실제로 생각한 답을 어떻게 구분하겠습니까?' }] },
      { kw: ['AI 활용', 'AI와 함께', '검증', '문제를 정의', '도구', 'AI를 쓰'], premise: 'AI를 잘 쓰는 능력은 시험으로 공정하게 잴 수 있다', premiseQ: 'AI 도구를 써 본 경험이 집안 형편에 따라 다르다면, 그 시험은 무엇을 재게 됩니까?',
        bank: [{ p: 'airesearch', t: 'AI 도구는 몇 달 단위로 바뀝니다. 올해 시험에서 잰 활용 능력이 내년 도구에서도 통한다고 볼 수 있습니까?', q: '도구가 바뀌어도 남는 능력이 무엇인지 정의할 수 있습니까?', src: 1 }] },
      { kw: ['AI가 틀린', 'AI가 어려워', '개념 조합', '못 푸는', '비중', '출제'], premise: 'AI가 지금 어려워하는 문항은 앞으로도 어려워한다', premiseQ: '다음 해 AI가 그 문항까지 풀어 버린다면, 이 방식은 무엇을 기준으로 다시 출제합니까?',
        bank: [{ p: 'airesearch', t: '올해 AI가 틀린 유형은 다음 버전에서 가장 먼저 보완됩니다. 그 문항의 비중을 늘리는 것은 해마다 AI를 뒤쫓는 출제가 되지 않겠습니까?', q: 'AI의 약점에 기대지 않고도 사고력을 재는 문항의 조건은 무엇입니까?', src: 1 }] },
    ],
    choshiPremise: '시험 점수는 같은 조건에서 푼 내 실력을 보여 준다',
    choshiQ: '같은 문제를 AI가 몇 분 만에 푼다면, 그 점수는 내 실력 중 어느 부분을 보여 줍니까?',
    choshiBank: [
      { p: 'future', t: '10년 뒤 직장에서는 정답을 빨리 찾는 일을 AI가 맡을 가능성이 큽니다. 지금 점수가 보여 주는 실력이 그때도 쓸모 있습니까?', q: '당신의 점수가 보여 주는 능력 중 AI가 대신하기 어려운 것은 무엇입니까?', src: 2 },
      { p: 'eng', t: 'AI는 정답을 빨리 찾지만, 왜 그 답인지 설명하는 데서는 틀리기도 합니다. 시험 점수가 그 차이를 보여 줍니까?', q: '정답과 설명 중 당신의 점수는 무엇을 쟀습니까?' },
    ],
    sampleChoshi: '내 점수는 내 실력을 보여 준다고 생각한다. 시험장에서는 AI를 못 쓰니까 내가 직접 푼 것이다. 열심히 공부한 결과다.',
    revisedChoshi: '내 점수는 내 실력의 일부만 보여 준다고 생각한다. 시험장에서 AI 없이 직접 풀었으니 정답을 찾는 실력은 분명히 내 것이다. 하지만 기사에 따르면 AI가 같은 문제를 몇 분 만에 만점으로 풀었으니, 그 실력은 AI가 쉽게 대신할 수 있는 부분이기도 하다. 그래서 점수는 내가 공부한 성실함은 보여 주지만, 왜 그렇게 풀었는지 설명하는 힘까지 보여 준다고는 보지 않는다.',
    revisedBoksi: '대입 시험은 채점의 객관성을 지켜야 한다. 기사에 따르면 AI가 수능을 몇 분 만에 만점으로 풀었지만, 이는 시험장 밖의 실험이고 시험장 안에서는 AI를 쓸 수 없다. 서술형은 채점자마다 점수가 달라질 수 있어, 수십만 명이 보는 시험에서는 결과를 납득시키기 어렵다. 물론 AI가 쉽게 푸는 문제로는 학생의 사고력을 잴 수 없다는 반론이 있다. 그래서 객관식 형식은 유지하되, 외운 공식 하나로 풀리는 문항보다 여러 개념을 엮어 판단해야 하는 문항을 늘려야 한다. 그러면 채점은 객관적으로 하면서도 외운 지식만으로는 풀 수 없는 시험이 된다.',
  },
};

/* ---------- 관점 지도 배치 (6그룹 고정 자리), 논리 점수 추정(×10 = 50점 만점), 기본 표 ---------- */
const POS = [[0.22, 0.28], [0.68, 0.22], [0.44, 0.52], [0.80, 0.56], [0.20, 0.72], [0.62, 0.72]];
const LOGIC = [2.8, 3.0, 3.1, 2.7, 3.2, 3.7]; // 추정값: g6(어람작 군집)이 가장 높게. 실사용 답안이 생기면 채점 결과로 바꿈
const two = (n) => String(n).padStart(2, '0');
// 요약 안의 작업 메모는 화면에 보이지 않게 뺌 (dateCheck 로 옮김)
const cleanSummary = (s) => s.replace(/\s*\((본문 대조 필요|[^)]*대조[^)]*)\)\s*/g, ' ').replace(/\s*\(경향신문\)\s*$/, '').trim();

const personaCards = {};
const articles = A.map((y) => {
  const id = ID[y.id];
  if (!id) throw new Error('알 수 없는 기사 id: ' + y.id);
  const x = EXTRA[id];
  const map = M.find((m) => m.article_id === y.id);
  const seeds = SD.filter((s) => s.article_id === y.id);
  const gi = Object.fromEntries(map.groups.map((g, i) => [g.id, i]));
  if (map.groups.length !== x.stances.length) throw new Error(`${id}: 그룹 ${map.groups.length}개, 보충 입장 ${x.stances.length}개`);

  // 페르소나
  const personas = y.personas_common.map((n) => { if (!COMMON[n]) throw new Error('공통 페르소나 없음: ' + n); return COMMON[n]; });
  for (const e of y.personas_expert) {
    const c = EXPERTS[e.name];
    if (!c) throw new Error('전문가 카드 없음: ' + e.name);
    personaCards[c.key] = { name: e.name, mark: c.mark, desc: c.desc, expert: true, focus: e.focus, asks: c.asks, tone: c.tone };
    personas.push(c.key);
  }
  for (const b of [...x.stances.flatMap((s) => s.bank), ...x.choshiBank]) if (!personas.includes(b.p)) throw new Error(`${id}: 예비 반론 페르소나 ${b.p} 가 이 기사 후보에 없음`);

  // 시드 번호: 복시 01~18, 초시 01~12 (그룹 순서대로)
  const order = (s) => gi[s.group_id] * 100 + Number(s.id.split('_').pop());
  const boksi = seeds.filter((s) => s.level === 'boksi').sort((a, b) => order(a) - order(b));
  const choshi = seeds.filter((s) => s.level !== 'boksi').sort((a, b) => order(a) - order(b));
  const nOf = new Map([...boksi.map((s, i) => [s.id, two(i + 1)]), ...choshi.map((s, i) => [s.id, two(i + 1)])]);
  const byId = Object.fromEntries(seeds.map((s) => [s.id, s]));

  const clusters = map.groups.map((g, i) => {
    const repId = g.is_minority ? (map.eoram_id || g.representative_id) : g.representative_id;
    const rep = byId[repId];
    if (!rep || rep.level !== 'boksi') throw new Error(`${id} ${g.id}: 복시 대표 답안을 찾지 못함 (${repId})`);
    return {
      label: g.name, stance: g.id, n: g.size, x: POS[i][0], y: POS[i][1], logic: LOGIC[i], ...(g.is_minority ? { tam: true } : {}),
      desc: g.description, share: g.share,
      s: { who: `응시자 ${nOf.get(rep.id)}`, text: rep.text, agree: g.is_minority ? 3 : g.size * 2, pen: g.is_minority ? 2 : g.size } // (11/20) 소수의견 대표는 어람작으로 따로: 장원(논리 표 최다)은 다수 그룹에서,
    };
  });

  const notes = [y.date_check, ...y.summary3.filter((s) => /대조|확인 필요/.test(s)).map((s) => '요약 메모: ' + s.match(/\(([^)]*)\)/)?.[1])].filter(Boolean);
  const placeholder = (v) => !v || /^\(.*\)$/.test(String(v).trim());
  const B = BODIES[y.category]; // 원문 docx (형준 11/20): 원문 주소, 언론사 제목, 문단
  const P = PHOTOS[id];
  return {
    article: {
      id, field: y.category, title: x.title,
      pressTitle: B?.title || (placeholder(y.title) ? null : y.title),
      url: B?.url || (placeholder(y.url) ? '' : y.url), source: y.press, pressGroup: y.press_group, date: y.published.slice(0, 10).replace(/-/g, '.'), published: y.published,
      ...(id === DEMO_ARTICLE ? { demo: true } : {}),
      image: P ? P.src : '', imageCredit: P ? P.credit : '', /* 기사 사진(img/articles/)과 출처. 리디자인(v4.4) 화면이 씀 */
      oneLine: y.one_line, issue: y.issue, guard: GUARD_OVERRIDE[id] ?? y.guard_note,
      otherView: y.other_view || null, dateCheck: notes.join(' / ') || null,
      body: B?.body?.length ? B.body : null, /* 원문 전문 (문단 배열). 있으면 시관 반론의 사실 근거가 요약 대신 원문 문장이 됨 */
      summary: y.summary3.map(cleanSummary),
      personas,
      q: { choshi: y.chosi, boksi: y.boksi, jeonsi: x.jeonsi },
      stances: map.groups.map((g, i) => ({ id: g.id, label: g.name, desc: g.description, ...x.stances[i] })),
      choshiPremise: x.choshiPremise, choshiQ: x.choshiQ, choshiBank: x.choshiBank,
      samples: { choshi: x.sampleChoshi, boksi: y.demo_answer.text },
      sampleNote: { stance: y.demo_answer.stance_group, weakness: y.demo_answer.weakness },
      revised: { choshi: x.revisedChoshi, boksi: x.revisedBoksi },
      clusters,
    },
    seeds: {
      boksi: boksi.map((s) => ({ n: nOf.get(s.id), g: gi[s.group_id], t: s.text, w: s.writer, arg: s.argument, src: s.id })),
      choshi: choshi.map((s) => ({ n: nOf.get(s.id), g: gi[s.group_id], t: s.text, w: s.writer, arg: s.argument, src: s.id })),
    },
    hints: (() => {
      const h = HINTS[y.category];
      const axes = ['쟁점 설명', '근거 활용', '맥락과 전제', '자기 입장', '결론과 함의'];
      if (!h || axes.some((k) => !h[k])) throw new Error(`${id}: 유민 TASK_HINT 에 ${y.category} 기사 힌트 5개가 없음`);
      return Object.fromEntries(axes.map((k) => [k, h[k]]));
    })(),
  };
});

/* ---------- index.html 에 써 넣기 ---------- */
const file = new URL('index.html', root);
let h = readFileSync(file, 'utf8');
const crlf = h.includes('\r\n');
h = h.replace(/\r\n/g, '\n');
const between = (startMark, endMark, text) => {
  const a = h.indexOf(startMark), b = h.indexOf(endMark, a + startMark.length);
  if (a < 0 || b < 0) throw new Error('구간을 찾지 못함: ' + startMark);
  h = h.slice(0, a) + text + h.slice(b);
};
const js = (o) => JSON.stringify(o);

// 1) PERSONAS + ARTICLES (기존 공통 페르소나 10명은 그대로, 전문가는 이번 기사 것으로 교체)
const pStart = h.indexOf('const PERSONAS = {');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(h.slice(pStart, h.indexOf('const ARTICLES', pStart)) + ';globalThis.__P=PERSONAS;', ctx);
const commonP = Object.entries(ctx.__P).filter(([, v]) => !v.expert);
if (commonP.length !== 10) throw new Error('공통 페르소나가 10명이 아님: ' + commonP.length);
for (const k of Object.values(COMMON)) if (!ctx.__P[k]) throw new Error('공통 페르소나 키 없음: ' + k);
const common = `  /* ---- 공통 관점 10명: 무엇을 가장 중요하게 보는가로 나눔 ---- */\n` + commonP.map(([k, v]) => `  ${k}: ${js(v)}`).join(',\n');
const expertsJs = Object.entries(personaCards).map(([k, v]) => `  ${k}: ${js(v)}`).join(',\n');
const header = `/* =========================================================
   오늘의 책문 시연 기사 v3 (11/19 기사 5편, 11/20 반영) — scripts/import-1119.mjs 로 생성. 직접 고치지 말고 스크립트나 yumin/1119/*.json 을 고친 뒤 다시 실행
   - 원본: 유민 articles_1119.json(기사), seeds_1119.json(시드 150편), perspective_map_1119.json(관점 지도 6그룹)
   - 유민 id → 화면 id: ${Object.entries(ID).map(([a, b]) => `${a}→${b}`).join(', ')}
   - stances 는 관점 지도 그룹 g1~g6 과 같음. kw, premise, premiseQ, bank 는 목업/예비 응답용 (형준 보충)
   - 새 칸: pressTitle(언론사 기사 제목), pressGroup, published, issue(쟁점), guard(시관 주의 사항, 서버 지시문에 들어감),
            otherView(다른 시각 기사), dateCheck(유민 확인 메모), sampleNote(예시 답안의 일부러 둔 빈틈), clusters[].desc/share
   - 정치 기사: 제목과 원문 주소가 아직 비어 있음 (pressTitle null, url '') → 유민 확인 후 JSON 고치고 다시 실행
   ========================================================= */
`;
if (h.includes('/* ---------- 데이터 (시연 기사 v2) ---------- */')) between('/* ---------- 데이터 (시연 기사 v2) ---------- */', 'const PERSONAS = {', '/* ---------- 데이터 (시연 기사 v3, 11/19 기사) ---------- */\n');
between('const PERSONAS = {', 'const LEVELS', `const PERSONAS = {\n${common},\n  /* ---- 전문가: 이번 기사 5편 (유민 이름·focus + 형준 카드) ---- */\n${expertsJs}\n};\n\n${header}const ARTICLES = [\n${articles.map((a) => js(a.article)).join(',\n')}\n];\n\n`);

// 2) SEEDS
const seedsObj = Object.fromEntries(articles.map((a) => [a.article.id, a.seeds]));
{
  const a = h.indexOf('/* (v4) 광장 예시 답안');
  const s = h.indexOf('const SEEDS = ', a);
  const e = h.indexOf('\n', s);
  if (a < 0 || s < 0 || e < 0 || s - a > 1500) throw new Error('SEEDS 구간을 찾지 못함');
  h = h.slice(0, a) + `/* (v4) 광장 예시 답안: 유민이 만든 AI 페르소나 시드 답안 (yumin/1119/seeds_1119.json, 기사별 복시 18 + 초시 12 = 30편).
   n: 번호, g: 관점 지도 그룹 순서(0=g1 … 5=g6), t: 본문, w: 글쓴이 설정, arg: 핵심 논거, src: 유민 시드 id.
   그룹 대표 답안(clusters[].s)과 어람작(tam 그룹)은 이 목록의 같은 번호 글입니다. */
const SEEDS = ${js(seedsObj)};` + h.slice(e);
}

// 3) 과제 힌트
const tStart = h.indexOf('const TASK_HINT={');
const tEnd = h.indexOf('\n};', tStart) + 3;
if (tStart < 0 || tEnd < 3) throw new Error('TASK_HINT 를 찾지 못함');
h = h.slice(0, tStart) + `const TASK_HINT=${JSON.stringify(Object.fromEntries(articles.map((a) => [a.article.id, a.hints])), null, 1)};` + h.slice(tEnd);

// 4) 기사 id 를 쓰는 다른 곳: 반 배정, 첫 기사, 교수 화면 예시 학생
const swaps = [
  [/assigned:\{articleId:'[a-z0-9]+',level:'boksi'/, `assigned:{articleId:'${DEMO_ARTICLE}',level:'boksi'`],
  [/const S=\{view:'start',step:0,articleId:'[a-z0-9]+'/, `const S={view:'start',step:0,articleId:'${DEMO_ARTICLE}'`],
];
for (const [re, to] of swaps) { if (!re.test(h)) throw new Error('못 찾음: ' + re); h = h.replace(re, to); }
const roster = [['examwatch', '03'], ['subway', '12'], ['aicsat', '16'], ['subway', '08'], ['examwatch', '14'], ['aicsat', '07']];
let k = 0;
h = h.replace(/(\{n:'학생 0\d',art:')[a-z0-9]+(',[^}]*?seed:')\d+('\})/g, (m, a, b, c) => { const [art, sd] = roster[k++ % roster.length]; return a + art + b + sd + c; });
if (k !== 6) throw new Error('교수 화면 예시 학생 6명을 찾지 못함: ' + k);

writeFileSync(file, crlf ? h.replace(/\n/g, '\r\n') : h);
console.log(`기사 ${articles.length}편, 시드 ${articles.reduce((s, a) => s + a.seeds.boksi.length + a.seeds.choshi.length, 0)}편, 전문가 ${Object.keys(personaCards).length}명 반영`);
