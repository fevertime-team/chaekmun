# 리디자인 v4.4 합치기: 충돌 정리 (11/20 12시 50분, 형준·Claude)

> 상태: **분석만 하고 아직 합치지 않음.** 우진이 디자인 UI를 다시 고치는 중이라, 최종 디자인이 오면 이 문서대로 합친다.
> 배포 사이트(chaekmun.vercel.app)는 지금 `main`의 옛 디자인 + 오늘의 기능 수정이 모두 들어간 상태.

## 1. 세 버전의 관계

| 버전 | 위치 | 내용 |
|---|---|---|
| base (v4.2) | `git show c3a9f70:index.html` | 우진 리디자인과 형준 작업이 함께 출발한 지점 |
| main (ours) | `index.html` (이 저장소 main) | 오늘 형준·Claude 작업 전부 (아래 2장) |
| v4.4 (theirs) | `해커톤 본선 진행/chaekmun-redesign-v4.4.html` | `origin/redesign`(820d78f, v4.3.1) + 기관용 v4.4 변경 186줄. 줄바꿈 LF |

합치는 방법 (자동 3자 병합 후 충돌만 손으로):

```
git show c3a9f70:index.html | tr -d '\r' > base.html
tr -d '\r' < index.html > main.html
tr -d '\r' < chaekmun-redesign-v4.4.html > v44.html   # 최신 디자인 파일로 바꿔서
cp main.html merged.html
git merge-file -L main -L base -L v44 merged.html base.html v44.html   # 11/20 기준 충돌 8곳
```

합친 뒤 반드시: `node scripts/import-1119.mjs && npm run data` (기사, 시드, 힌트, 페르소나, 사진, 원문을 다시 써 넣음), `npm run typecheck`, `npm run smoke`.

## 2. main 에만 있는 것 (합칠 때 잃으면 안 되는 것)

| 기능 | 화면 코드에서 찾을 곳 |
|---|---|
| 11/19 기사 5편, 시드 150편, 관점 지도 6그룹, 원문 전문, 기사 사진 | `PERSONAS`, `ARTICLES`, `SEEDS` (import-1119.mjs 가 생성. 손으로 고치지 말 것) |
| 유민 TASK_HINT (이 기사에서는) | `TASK_HINT` (import-1119.mjs 가 생성) |
| 오늘의 과제 단계 제거: 기준마다 과제 하나(옛 중급 iss2, evi2, ctx2, pos2, con2), 다음 과제 규칙 | `TASKS`, `makeTask(axis,why)`, `getNextTask`, `axisChip` |
| Supabase 저장 (가입, 로그인, 글, 투표, 교수 설정) | `REMOTE`, `DB.signUp/signIn/saveEssay/listEssays/toggleVote/saveClass` |
| 다른 관점 반론: 반론 상자 안에서만 로딩, 앞서 받은 반론 접힌 목록 | `runOtherPersona`, `pastRebuttalsHTML`, `redrawKeep`, `S.pastRebuttals`, `S.otherLoading`, CSS `.rbload .dots .past` |
| 서버 쪽 (화면과 무관, 충돌 없음) | `server/*`, `api/*`, `usage.html` |

## 3. 충돌 8곳과 정리 방법

| # | 위치 | main | v4.4 | 정리 |
|---|---|---|---|---|
| 1 | CSS: 반론, 주석, 짚어 볼 곳 스타일 | 옛 디자인 + 로딩·이전 반론 스타일 | 새 디자인 | **v4.4 를 쓰고**, `.rbload .dots .past` 스타일만 새 색(`--ink`, `--ink3`, `--paper-2`, `--rule`)으로 바꿔 덧붙임. v4.4 에는 `--jjok` 이 없음 |
| 2 | `ARTICLES` 데이터 | 새 기사 5편 | 옛 기사 5편 + 빈 `image`, `imageCredit` | **main 을 쓰고** import 스크립트 다시 실행 (사진, 출처 칸은 이미 채워짐) |
| 3 | `CLASSES` | `assigned.articleId:'examwatch'` | `centerCode:'YONSEI-CTL'`, `assigned.classAt`, `program:{name:'매일 책문',goal:20}`, `articleId:'aiexam'` | **v4.4 를 쓰고 `articleId` 만 `'examwatch'`** (import 스크립트가 자동으로 바꿈) |
| 4 | `DB.saveRubric/saveFocus/assign` | Supabase 저장(`saveClass`) | `assign` 에 `classAt:'다음 수업', due:'수업 전날 자정'` | **main 의 saveClass 구조 + v4.4 의 assign 값** |
| 5 | `resetWriting`, `clearAfterDraft`, `isCenter` | `pastRebuttals`, `otherLoading` 추가 | `isCenter` 추가 | **둘 다** |
| 6~8 | 오늘의 과제 카드 3곳 (`taskPickHTML`, `taskWriteHTML`) | `axisChip(t)`, 단계 없음 | `tierChip(t)` + `streakHTML()` + `pathMini(t)` (급제 길) | **결정 필요 (4장)** |

## 4. 결정이 필요한 것

### 4-1. 급제 길 vs 단계 제거 (가장 큰 충돌)
- v4.3 부터 "급제 길"은 기준마다 **기초·중급·심화 세 칸**(5기준 × 3 = 15칸). 오늘의 과제 카드(`pathMini`), 나의 기록(`path3`, 15칸 길), 데모 계정 기록(`PROFILE.cleared: ['iss1','iss2','evi1','ctx1','pos1','pos2','con1']`, 기관 학생 `['iss1','evi1','pos1']`)이 모두 단계 id 에 기댐.
- 11/20 결정: 오늘의 과제에서 **단계를 뺌** (기준마다 과제 하나).
- 선택지
  - A. **기준별 1칸** 급제 길 (5칸): `path3` 를 한 칸으로, `cleared` 를 `iss2, evi2, ctx2, pos2, con2` 중에서 다시 고름. 단계 제거와 일관
  - B. **단계 되살리기**: 급제 길 그대로, 오늘의 과제도 다시 세 단계
- `연속 응시`(streakHTML, 최근 7일 칸)는 단계와 무관하니 그대로 써도 됨

### 4-2. 센터 계정이 Supabase 에 가입하지 못함
- v4.4 는 `YONSEI-CTL` 코드로 `role:'center'` 계정을 만듦. 서버 `server/store.ts` 의 `ROLES` 는 `personal, student, professor` 만 허용 → **새 센터 계정 가입 시 400**. 시연 계정 `center` 는 화면 안에만 있어서 문제없음.
- 합칠 때 `ROLES` 에 `center` 추가. 센터는 글을 쓰지 않으니 `saveEssay` 는 그대로 둬도 됨.

### 4-3. 글꼴 3.1MB 가 HTML 안에
- v4.4 는 Song Myung, Pretendard 를 base64 로 HTML 에 넣음 (파일 3.4MB). 첫 화면이 느려지고, 고칠 때마다 3MB 를 다시 배포.
- 권장: `fonts/*.woff2` 로 빼고 `url(fonts/...)` 로 바꿈 (Vercel 이 캐시함). 디자인은 그대로.

### 4-4. 수업 화면(vBoard) 숫자
- 우리 반 글(classId)로 계산 → 새 기사 기준이면 예시 반 학생 9편 + 실제 반 학생 글. 교수 화면의 "수업 전 제출 27/32" 와 다름 (v4.4 변경 목록의 맹점 그대로). 발표에서 숫자 비교하지 않기.

## 5. 오늘 데이터 쪽에서 바뀐 것 중 유민 확인이 필요한 것
| 항목 | 내용 |
|---|---|
| 정치 기사 | 원문 docx 로 제목 「민주유공자법 국회 본회의 상정…野 필리버스터 돌입」, 주소 newsis NISX20261119_0003875203 채움. 3줄 요약은 아직 오전 기사 기준 |
| 사회 기사 guard | 유민 "25일 총파업은 19일 본문 확인 전 인용 금지" → 19일 경향 본문에 있어서 인용 허용으로 바꿈 (`GUARD_OVERRIDE`) |
| 교육 기사 주소 | 포털 주소 → 한겨레 원문 주소 |
| 정치 원문 | "전두환의 후예들" 고성 인용이 본문에 있음. guard("특정 정당 평가 금지")가 막지만 시연 전 한 번 확인 |
| 사진 출처 | `imageCredit` 은 기사 언론사로 적어 둠. 정확한 사진 출처(특히 뉴시스 워터마크 사진) 확인 필요 |
