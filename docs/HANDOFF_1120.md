# 오늘의 책문 본선 작업 인수인계 (11/20 오후 1시)

> 새 채팅에서 이 파일 하나만 붙이면 이어서 작업할 수 있게 정리했습니다.
> 저장소 안에도 같은 내용이 `docs/HANDOFF_1120.md` 로 있습니다. 충돌 상세는 `docs/MERGE_v4.4_충돌정리.md`.

---

## 0. 새 채팅에 붙여 넣을 프롬프트

```
너는 해커톤 서비스 "오늘의 책문"(팀 FEVERTIME) 본선 당일 작업을 이어받는 개발 파트너야. 나는 풀스택 담당 김형준이고, 한국어로, 용어는 쉽게 풀어서 설명해 줘.

먼저 아래 두 파일을 끝까지 읽어:
1) D:\대외활동 및 장학금\01. 교내활동 및 학교연계활동\2026 연세 캠퍼스타운 AI 스타트업 해커톤\해커톤 본선 진행\HANDOFF_새채팅_1120.md
2) 저장소 docs/MERGE_v4.4_충돌정리.md

작업 폴더(저장소): D:\대외활동 및 장학금\01. 교내활동 및 학교연계활동\2026 연세 캠퍼스타운 AI 스타트업 해커톤\chaekmun-v4.1\chaekmun-v4.1
GitHub fevertime-team/chaekmun 의 main 이 배포 원본이고, main 에 push 하면 Vercel(chaekmun.vercel.app)이 30~40초 뒤 자동 배포돼.

이번에 할 일: 우진이 보낸 최신 리디자인 파일(첨부, chaekmun-redesign-v4.x.html)을 main 의 index.html 로 합치기.
- 충돌 정리 문서의 방법(3자 병합)과 "main 에만 있는 것" 목록을 지켜. 기사·시드·힌트 데이터는 손으로 고치지 말고 node scripts/import-1119.mjs && npm run data 로 다시 써.
- 급제 길(기초·중급·심화 3칸)과 "단계 제거" 충돌은 내가 정한 방향(아래에 적음)대로 해: ______
- 합친 뒤 학생(YONSEI-STU), 교수(YONSEI-PROF), 센터(YONSEI-CTL), 개인 시연 계정으로 화면을 다 눌러 보고, 실제 AI 호출은 예상 비용을 먼저 말한 뒤에 해.
- push 전에는 꼭 나에게 물어봐. API 키는 채팅에 붙이지 않을 거고, 너도 입력칸에 넣지 마.
```

---

## 1. 지금 상태 (11/20 13시)

| 항목 | 상태 |
|---|---|
| 배포 사이트 | https://chaekmun.vercel.app — **실제 Claude 동작 중**, Supabase 저장 켜짐, 새 기사 5편(원문 전문, 사진 포함), 디자인은 **옛 디자인(v4.2 계열)** |
| 사용량 화면 | https://chaekmun.vercel.app/usage.html — 남은 예산(추정), 오늘·누적 금액, 30초마다 갱신 |
| 대회 키 | Vercel 환경 변수 `ANTHROPIC_API_KEY` 에 들어 있음, 내 PC `저장소/.env.local` 에도 있음. **오늘 오후 8시 만료** |
| 예산 | 12만 원 중 약 1천 원 사용 (usage.html 참고). 글 한 편 끝까지 약 100~200원 |
| 리디자인 | 우진 v4.4 수령, **아직 안 합침** (디자인 다시 고치는 중). 충돌 정리만 해 둠 |

## 2. 어디에 무엇이 있나

| 대상 | 위치 |
|---|---|
| 저장소 (작업 폴더) | `...\해커톤\chaekmun-v4.1\chaekmun-v4.1` = GitHub `fevertime-team/chaekmun` (`main` 배포, `redesign` 은 우진 브랜치) |
| Vercel | 프로젝트 `kimhj2/chaekmun` (Chrome 에 로그인돼 있음). 환경 변수: ANTHROPIC_API_KEY + Supabase 연동 변수 16개 (Production) |
| Supabase | 조직 FEVERTIME, 프로젝트 "AI HACKATHON" (id `zmknadwvxulnmyoppcyz`). 테이블 `app_users, essays, votes, class_settings, llm_usage` + 뷰 `llm_usage_by_model`. 정의는 `docs/supabase.sql` |
| 유민 데이터 원본 | `저장소/yumin/1119/` (articles_1119.json, seeds_1119.json, perspective_map_1119.json, FEVERTIME_TASK_HINT_1119.md, articles_body_1119.json, 원문 docx 등) |
| 기사 사진 | `저장소/img/articles/` (filibuster.webp, chinafta.png, subway.png, examwatch.png, aicsat.webp) |
| 우진 리디자인 | `해커톤 본선 진행/chaekmun-redesign-v4.4.html` + `FEVERTIME_기관용_v4.4_변경목록.md` |
| 교수·센터 화면 참고 캡처 | 형준이 받은 학기 리포트, 수업 화면 캡처 2장 (v4.4 의 vCenter, vBoard 와 같은 모양) |

## 3. 자주 쓰는 명령 (저장소 폴더에서)

| 명령 | 하는 일 | 비용 |
|---|---|---|
| `npm run dev` | 내 PC 에서 화면 + API 서버 (http://localhost:3200). `.env.local` 키를 요청마다 다시 읽음 | 쓴 만큼 |
| `node scripts/import-1119.mjs && npm run data` | 유민 데이터 → 화면 데이터(index.html) → 서버 데이터(server/content.json) | 0 |
| `npm run typecheck` / `npm run smoke` | 타입 검사 / 가짜 AI 로 흐름 점검 | 0 |
| `npm run smoke:real` | 실제 키로 흐름 점검 (약 12회 호출) | 약 100~200원 |

Claude Code 앱의 미리보기 이름: `chaekmun-v4.2-local` (`.claude/launch.json`).

## 4. 오늘 한 일 (커밋 순서)

| 커밋 | 내용 |
|---|---|
| 411cfe7, be0e301 | Supabase 저장 연결 (`/api/db`, 서버 키로만 접근, RLS 켬). 시연 계정·예시 답안은 저장 안 함. 로컬 점검 서버 `npm run dev` |
| bdd5186 | 11/19 기사 5편 + 시드 150편 + 관점 지도 6그룹 (`scripts/import-1119.mjs`). 전문가 페르소나 10명, 기사별 guard 를 AI 지시문에 넣음 |
| f51a84b | 오늘의 과제: 유민 TASK_HINT 반영, **기초·중급·심화 제거** (기준마다 옛 중급 과제 하나: 두 가치에 이름 붙이기 / 근거 해석 / 반례와 답 / 반대쪽 강한 말 + 기준 / 결론의 결과). 다음 과제: 가장 약한 기준, 그게 오늘 과제였고 해냈으면 두 번째로 약한 기준 |
| e28daba, d1f6554 | Claude 5.5 호출 수정: `temperature` 보내지 않음(400), 생각(thinking) 끔(Sonnet `between_tools`, Haiku `disabled`), 내부 줄 번호 노출 막기 |
| 82b337e | 사용량 기록: 호출마다 Supabase `llm_usage` 에 저장, `/usage.html`, `/api/usage` |
| 83f7538 | 반론 개선: 검수 모델 오탐 줄임, 검수 실패 시 빈 틀 대신 기사별 예비 반론, "다른 관점의 반론"을 반론 상자 안에서만 로딩 + 앞서 받은 반론 접힌 목록 |
| (이번) | 원문 전문 5편, 기사 사진 5장, 정치 기사 제목·주소 채움, 교육 기사 한겨레 원문 주소, 사회 기사 guard 수정, 충돌 정리 문서, 이 인수인계 |

## 5. 정해진 것 (바꾸지 말 것)

- 앱 안의 AI 는 Claude Sonnet 5.5(분석·반론·채점), Haiku 5.5(검수·분류·배치). 생각(thinking) 끔, temperature 안 보냄
- 시연 기본 기사: 교육(`examwatch`). 기관 반 배정도 교육 기사
- 오늘의 과제는 단계 없음 (형준 11/20 확정). 남긴 과제는 옛 중급 5개
- 시연 계정(demo, student, professor, center)은 저장하지 않음 → 시연 반복해도 깨끗함
- 키는 채팅·코드·GitHub 에 넣지 않음. Claude 는 키 입력칸에 직접 넣지 않음 (형준이 직접)

## 6. 남은 일과 결정할 것

| # | 할 일 | 비고 |
|---|---|---|
| 1 | **최종 리디자인 합치기** | `docs/MERGE_v4.4_충돌정리.md`. 충돌 8곳, 대부분 기계적 |
| 2 | **급제 길 결정** (가장 큰 충돌) | A. 기준별 1칸(5칸)으로 / B. 단계 되살리기. 데모 기록 `cleared` id 도 같이 정리 |
| 3 | 센터 계정 Supabase 가입 | `server/store.ts` `ROLES` 에 `center` 추가 (합칠 때) |
| 4 | 글꼴 3.1MB 분리 | v4.4 가 HTML 안에 글꼴을 넣음. `fonts/` 로 빼면 첫 화면이 빨라짐 (권장) |
| 5 | 유민 확인 | 정치 3줄 요약을 14:54 본문과 대조, 사진 출처, 사회 guard 수정 동의, 정치 원문의 "전두환의 후예들" 인용 |
| 6 | 리허설 | 오후 8시 키 만료 전. 발표 직전·중에는 push 하지 않기 |
| 7 | 발표 숫자 | 수업 화면 답안 수와 교수 화면 "27/32" 비교하지 않기, 학기 리포트는 예시 배지 |

## 7. 알아 둘 함정

- Windows 에서 카카오톡 받은 파일 폴더(OneDrive)는 파일이 금방 옮겨짐. 받은 파일은 `해커톤 본선 진행` 폴더로 옮겨서 쓰기
- `index.html` 은 CRLF 줄바꿈, v4.4 파일은 LF. 비교·병합 전 `tr -d '\r'` 로 맞추기
- 로컬 서버는 코드를 바꾸면 다시 켜야 반영됨 (키 파일만 예외)
- Vercel 환경 변수를 바꾸면 재배포해야 적용 (빈 커밋 push 로 가능)
- 검수(Haiku)가 반론을 너무 자주 거르면 `server/prompts.ts` 의 `VERIFY_SYSTEM` "위반이 아닌 것"을 손볼 것. 걸린 구절은 서버 로그 `[guard]` 줄에 남음
