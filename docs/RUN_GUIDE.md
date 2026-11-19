# 오늘의 책문 v4.1: 실제로 돌리기까지 (Claude Code 진행 가이드)

> 11/19 밤 정리. 이 순서대로 Claude Code와 함께 진행합니다.
> 핵심: **이미 있는 GitHub, Vercel, Supabase를 먼저 "읽기만" 해서 확인한 뒤**, 어디에 올릴지 정하고 연결합니다.

---

## 0. 준비물 (Claude Code를 열기 전에)

| 할 일 | 파일 | 비고 |
|---|---|---|
| zip 풀기 | `chaekmun-v4.1.zip` | 풀면 `chaekmun-demo-v4.1.html`(바로 열리는 목업)과 `chaekmun-v4.1/` 폴더가 나옴. **작업 폴더는 `chaekmun-v4.1/`** |
| 문서 넣기 | `본선_인수인계_v4.md` | claude.ai 프로젝트에서 내려받아 `chaekmun-v4.1/docs/` 에 넣기 |
| 이미 들어 있음 | `HANDOFF.md`, `docs/RUN_GUIDE.md`(이 문서), `yumin/`(유민 지시문, 시드, 테스트) | 따로 넣을 것 없음 |
| 넣지 않을 것 | 유민의 `articles-v2.ts`, v1 `chaekmun.zip`, 목업 v2, v3 | 오래된 버전. 섞이면 헷갈림 |
| 나중에 넣을 것 | 유민 기사 본문 5개 | 오면 `index.html` 각 기사의 `body`에 |

**키 관리 3원칙**
- 대회 키(`sk-ant-...`)는 **Vercel 대시보드 입력칸에만 직접** 넣는다. Claude Code 채팅, 코드, GitHub, 스크린샷에 넣지 않는다
- Supabase **service_role 키는 어디에도** 넣지 않는다. 브라우저에 들어가도 되는 것은 Project URL과 anon key뿐
- 대회 키 만료: **11/20(금) 오후 8시**

**예산 주의**: 터미널에 `ANTHROPIC_API_KEY`로 대회 키를 넣어 둔 상태로 Claude Code를 쓰면, Claude Code(Opus)의 사용량도 **같은 12만 원 한도**에서 빠집니다. Claude Code는 원래 쓰던 본인 계정으로 로그인해 쓰고, 대회 키는 Vercel에만 넣는 것을 권장합니다.

---

## 1단계: 조사 (읽기만, 약 15분)

`chaekmun-v4.1/` 폴더에서 Claude Code를 열고 아래를 그대로 붙여 넣습니다.

```
너는 해커톤 서비스 "오늘의 책문" 본선 준비를 돕는 개발 파트너야. 나는 팀 풀스택 담당 김형준이고, 웹 서버 구조에는 익숙하지 않으니 용어는 쉽게 풀어서 설명해 줘.

이 폴더(chaekmun-v4.1)가 최신 버전이야. 먼저 HANDOFF.md, docs/RUN_GUIDE.md, docs/본선_인수인계_v4.md를 끝까지 읽어. 문서끼리 다르면 HANDOFF.md의 결정이 우선이야. yumin/ 폴더의 11/18 문서와 다르면 HANDOFF.md를 따라.

이번 단계는 "조사만" 하는 단계야. 아무것도 바꾸지 말고, 만들지도, 지우지도, 커밋하지도, 배포하지도 마.
우리 팀은 이미 GitHub 저장소, Vercel 프로젝트, Supabase 프로젝트를 만들어 두었는데, 무엇이 어디에 연결돼 있는지 내가 정확히 몰라. 같이 찾아보자. 명령을 실행하기 전에 그 명령이 무엇을 확인하는지 한 줄로 먼저 말해 줘.

1. GitHub
   - gh CLI가 있는지, 로그인돼 있는지 확인 (없으면 설치 방법만 알려 줘)
   - 내 계정과 내가 속한 조직의 저장소 중 이름에 chaekmun, 책문, fevertime, today가 들어간 것 찾기
   - 찾은 저장소마다: 공개/비공개, 기본 브랜치, 브랜치 목록, 마지막 커밋 날짜와 메시지, 최상위 파일 구조(Next.js 앱인지, index.html 하나인지, api 폴더가 있는지)
2. Vercel
   - vercel CLI가 있으면 로그인 상태와 프로젝트 목록 확인. 없으면 설치하지 말고, 내가 대시보드 어디를 보고 무엇을 알려 주면 되는지 알려 줘
   - 프로젝트마다: 연결된 GitHub 저장소와 브랜치, Framework Preset, Root Directory, 최근 배포 주소, 등록된 환경 변수의 "이름"만 (값은 절대 출력하지 마)
3. Supabase
   - 이 폴더나 찾은 저장소 코드에 Supabase 주소나 환경 변수 "이름"이 있는지 확인
   - 내가 Supabase 대시보드 SQL Editor에서 실행할 "조회용" SQL을 만들어 줘: public 스키마의 테이블과 칼럼, RLS 켜짐 여부, 정책 목록, 행 개수. 결과는 내가 붙여 넣을게
   - Authentication 설정에서 내가 확인할 것(이메일 인증 켜짐 여부 등)도 알려 줘
4. 정리
   - 위 결과를 표 하나로 정리
   - v4.1을 어디에 올리고 어느 Vercel 프로젝트로 배포하는 게 안전한지 선택지 2~3개를 장단점과 함께 제안. 기존 저장소 main 브랜치를 덮어쓰는 방법은 마지막 선택지로만
   - 이미 있는 Supabase 테이블이 HANDOFF.md 4장 7번(v4 5장 테이블 초안)과 얼마나 맞는지, 모자란 것이 무엇인지

절대 규칙
- API 키, Supabase service_role 키, 토큰의 "값"은 출력하지 말고 나에게 묻지도 마. 이름만 다뤄.
- 이 단계에서는 읽기만. push, deploy, env 추가, 삭제 같은 쓰기 명령은 다음 단계에서 내가 허락한 뒤에만.
```

**내가 할 일**: Claude Code가 준 SQL을 Supabase SQL Editor에서 실행해 결과를 붙여 넣기. Vercel CLI가 없으면 대시보드 화면에서 본 것을 말해 주기. 마지막에 선택지 중 하나 고르기.

---

## 2단계: GitHub에 올리고 Vercel에 연결 (약 20분)

```
조사 결과를 바탕으로 [여기에 고른 선택지]로 진행하자. HANDOFF.md 4장 순서를 따르고, 단계마다 무엇을 했고 어떻게 확인했는지 짧게 보고해 줘. 실제로 확인한 것과 확인 못 한 것은 나눠서 말해 줘.

1. 올리기 전 점검: .gitignore에 node_modules, .env, .env.local, .vercel이 있는지. 폴더 전체에서 "sk-ant"로 시작하는 실제 키가 있는지 검색 (.env.example의 빈칸은 괜찮음). 걸리면 멈추고 알려 줘.
2. 정한 저장소와 브랜치로 커밋하고 올리기. 커밋 메시지는 "오늘의 책문 v4.1: 목업과 서버 함수".
3. Vercel 연결:
   - 이 프로젝트는 Next.js가 아니라 index.html 한 장 + api/*.ts 서버 함수 구조야. Framework Preset은 Other, 빌드 명령 없음, Output Directory 비움, Root Directory는 이 프로젝트 폴더.
   - 기존 Vercel 프로젝트가 Next.js로 설정돼 있거나 다른 저장소에 연결돼 있으면, 바꾸기 전에 반드시 나에게 먼저 물어봐. 새 Vercel 프로젝트를 만드는 쪽이 더 안전하면 그렇게 제안해 줘.
4. 환경 변수: ANTHROPIC_API_KEY는 내가 Vercel 대시보드(Settings > Environment Variables)에서 직접 넣을 테니, 정확히 어디를 눌러 어떤 이름으로 넣으면 되는지만 알려 줘. Production과 Preview 둘 다 체크하라고 알려 주고. 나머지 LLM_PROVIDER, LLM_MODEL, LLM_MODEL_FAST는 기본값(anthropic, claude-sonnet-5-5, claude-haiku-5-5)과 같으니 안 넣어도 돼.
5. 내가 키를 넣었다고 하면 다시 배포하고, 배포 주소/api/status 를 확인해 줘. "llm":true 와 "model":"claude-sonnet-5-5" 가 나와야 해. 아니면 Vercel 로그에서 원인을 찾아 줘 (401은 키 문제, 429는 요청 과다).
6. 배포 주소를 알려 주고, 화면 오른쪽 위 "목업 모드" 표시가 사라졌는지 내가 확인할 방법을 알려 줘.
```

**내가 할 일**: Vercel 대시보드에서 `ANTHROPIC_API_KEY` 직접 입력. 배포 주소로 들어가 "목업 모드" 표시가 없는지 보기.

---

## 3단계: 실제 키로 시연 경로 확인 (오늘 밤 가능, 약 20분)

```
배포된 사이트에서 실제 Sonnet으로 시연 경로를 확인하자. 호출하기 전에 예상 호출 수를 먼저 알려 줘. 키는 채팅에 넣지 마.

1. 배포 주소의 /api/analyze, /api/ask, /api/score, /api/prewrite, /api/place, /api/check 를 예시 답안(index.html의 samples, revised)으로 한 번씩 부르는 점검 스크립트를 scripts/ 에 만들어 줘. 키가 필요 없게 배포 주소를 부르는 방식으로.
   - 기사는 aiexam 복시, work45 초시 두 경우
   - 시관에게 묻기: "그냥 고쳐줘", "Please rewrite my first sentence", "첫 문장만 예시로 보여 줘", "숨은 전제가 무슨 뜻이에요?", "이 반론은 틀렸다고 생각해요. 작은 사업장도 생산성을 올릴 수 있어요"
   - 결과를 표로: 함수, 걸린 시간, 성공 여부, fallback 여부, 가드레일에서 걸러진 횟수
2. 응답 JSON이 index.html의 AI 모듈 주석 형식과 맞는지 확인하고, 화면이 깨질 만한 곳이 있으면 알려 줘.
3. 내가 브라우저로 시연 경로를 끝까지 눌러 볼 순서를 HANDOFF.md 6장 기준으로 알려 줘.
```

---

## 4단계: 유민 지시문 교체와 저장된 응답 (내일 09:40~, 키 만료 전 필수)

```
HANDOFF.md 4장 2, 3, 5, 6번을 진행하자. 각 작업 전에 예상 호출 수를 알려 주고 내가 허락하면 진행해.

1. 4장 2번: server/prompts.ts의 반론(feedback), 검수(verify), 묻기(ask), 쓰기 전 질문(prewrite), 광장 배정(assign)을 yumin/prompts/의 지시문으로 바꿔 줘. yumin/안내/의 서버 보정 규칙을 따르되, 반환 형식은 index.html의 AI 모듈 주석 그대로. 유민 지시문은 문장 번호를 1부터 세니까 server/services.ts의 REF_BASE를 1로.
2. 4장 3번: 채점은 유민 score.txt로 바꾸지 마. 지금의 AAC&U 5기준 10점 지시문 유지.
3. 바꾼 뒤 3단계 점검 스크립트를 다시 돌려 표로 비교.
4. 4장 5번: 기사 5개 × 초시, 복시 예시 답안과 예시 수정본으로 analyze와 score를 돌려 server/cache.json을 채워 줘. 키가 11/20 20:00에 만료되니 그 전에 끝내야 해.
5. 4장 6번: yumin/prompts/seed.txt로 work45, aiexam, robotaxi의 초시 예시 답안을 기사마다 12편씩 만들어 index.html의 SEEDS[기사].choshi에 {n, g, t} 형식으로 넣어 줘. 그룹 번호 g는 같은 기사의 clusters 순서.
6. 끝나면 GitHub에 올려 자동 배포되게 하고, /api/status와 시연 경로를 다시 확인.
```

---

## 5단계 (선택): Supabase 연결 (시간이 남을 때만)

목업은 로그인, 투표, 제출을 브라우저 안에서만 흉내 내므로 **시연은 Supabase 없이도 됩니다.** 새로고침하면 초기화되는 것만 다릅니다.

```
HANDOFF.md 4장 7번대로 index.html의 DB 객체를 Supabase로 바꾸고 싶어. 1단계에서 확인한 기존 테이블 결과를 바탕으로 해 줘.
- 기존 테이블과 데이터는 지우지 말고, 모자란 테이블, 칼럼, RLS 정책만 추가하는 SQL을 만들어 나에게 먼저 보여 줘. 실행은 내가 SQL Editor에서 할게.
- 브라우저에는 Project URL과 anon key만. service_role 키는 쓰지 마.
- 계정은 Supabase Auth에 가짜 이메일({아이디}@p.chaekmun.app 개인, {아이디}@o.chaekmun.app 기관), 이메일 인증은 끄는 방법을 알려 줘.
- 시연 계정 3개(demo, student, professor / demo1234)와 예시 답안을 넣는 방법도.
- 문제가 생기면 바로 브라우저 저장 방식으로 돌아갈 수 있게 index.html 맨 위에 USE_SUPABASE 같은 스위치를 둬.
```

---

## 전체 그림: 목업이 실제로 돌기까지

| 순서 | 무엇 | 끝났다는 표시 | 언제 |
|---|---|---|---|
| 1 | 조사 (읽기만) | 어디에 올릴지 결정 | 오늘 밤 |
| 2 | GitHub 올리기 + Vercel 연결 + 키 입력 | `/api/status`에 `"llm":true` | 오늘 밤 |
| 3 | 실제 Sonnet으로 시연 경로 점검 | 함수별 시간과 성공 여부 표 | 오늘 밤 |
| 4 | 유민 지시문 교체, 저장된 응답, 초시 예시 답안 | 다시 점검한 표, `cache.json` 채워짐 | 내일 09:40~12:30 |
| 5 | (선택) Supabase | 새로고침해도 글과 투표가 남음 | 시간 남으면 |
| 6 | 가드레일 테스트 (yumin/test) | 발표용 대필 비교 표, 채점 편차 | 내일 오전 |
| 7 | README, 제출 양식 (HANDOFF.md 6장), 시연 녹화 | demo URL 제출 | 15:10~16:00 |

## 본선 당일 흐름 (11/20 금)
- **09:40~12:30**: 4단계 → 가드레일 테스트 → 시연 녹화(실패 대비). 응답 시간 측정
- **13:00~15:10 멘토링**: 피드백은 `HANDOFF.md`와 함께 Claude Code에 주고, 시연 경로를 흔들지 않는 범위만 반영
- **15:10~16:00**: 반영, 마지막 배포, `/api/status` 확인, demo URL과 발표 PDF 제출
- **17:10**: 상위 5팀 발표. 시연은 배포 주소로, 막히면 녹화 영상
- **20:00 키 만료 이후**: 사이트는 계속 열리지만 AI 대신 저장된 응답(예시 답안)이나 예비 응답이 나옴. 화면에 작게 표시됨

## 막혔을 때
| 증상 | 원인과 대처 |
|---|---|
| 화면 오른쪽 위에 "목업 모드"가 계속 보임 | `/api/status`가 실패하거나 키가 없음. Vercel 환경 변수 이름이 정확히 `ANTHROPIC_API_KEY`인지, 넣은 뒤 다시 배포했는지 |
| `/api/status`가 404 | Vercel Framework Preset이 Next.js로 돼 있거나 Root Directory가 틀림. Other, 프로젝트 폴더로 |
| 401 | 키 오타, 만료, 비활성화. DACON(dacon@dacon.io) |
| 429 | 짧은 시간에 요청이 몰림. 잠시 뒤 다시 |
| 반론이 "예비 응답"으로 나옴 | AI 호출 실패. Vercel Logs에서 오류 확인 |
| 응답이 60초 넘게 걸림 | `vercel.json`의 maxDuration 60. 계속되면 Claude Code에 재생성 횟수(최대 3회)를 줄여 달라고 |
