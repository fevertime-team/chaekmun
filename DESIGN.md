---
name: 오늘의 책문
description: 뉴스 앱의 골격 위에 한지, 먹, 주홍 낙관으로만 들어온 과거 시험장
colors:
  paper: "#F3EDE0"
  paper-2: "#E9E1CF"
  sheet: "#FCFAF4"
  ink: "#1E1A16"
  ink2: "#4F473D"
  ink3: "#6F6658"
  rule: "#E2D8C5"
  rule-2: "#CDBFA5"
  seal: "#C2402A"
  seal-deep: "#A8301E"
  seal-t: "#F7E4DB"
  hong: "#D9797B"
  hong-deep: "#8F1D1F"
  cover-ground: "#EFE6D2"
  dc-blue: "#2F5D8A"
  dc-yellow: "#D6A23A"
  dc-green: "#3E7A5C"
  wood: "#4A3727"
  wood-2: "#7A5E43"
typography:
  display:
    fontFamily: "Song Myung, AppleMyungjo, Noto Serif KR, Batang, serif"
    fontSize: "clamp(2.1rem, 8vw, 2.8rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Song Myung, AppleMyungjo, Noto Serif KR, Batang, serif"
    fontSize: "clamp(1.85rem, 6.2vw, 2.35rem)"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  question:
    fontFamily: "Song Myung, AppleMyungjo, Noto Serif KR, Batang, serif"
    fontSize: "clamp(1.36rem, 4.6vw, 1.62rem)"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.01em"
  news-headline:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, Apple SD Gothic Neo, sans-serif"
    fontSize: "clamp(1.38rem, 5vw, 1.62rem)"
    fontWeight: 800
    lineHeight: 1.32
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, Apple SD Gothic Neo, sans-serif"
    fontSize: "1.18rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, Apple SD Gothic Neo, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
  reading:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, Apple SD Gothic Neo, sans-serif"
    fontSize: "1.04rem"
    fontWeight: 400
    lineHeight: 1.9
  label:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, Apple SD Gothic Neo, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  seal: "4px"
  paper: "6px"
  segment: "11px"
  ctl: "12px"
  card: "16px"
  panel: "20px"
  pill: "999px"
spacing:
  gutter: "16px"
  card-x: "20px"
  stack: "14px"
  section: "40px"
  column: "720px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "50px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "50px"
  link:
    textColor: "{colors.seal}"
    padding: "10px 0"
  segmented:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink2}"
    rounded: "{rounded.segment}"
    padding: "3px"
  segmented-selected:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "9px"
    padding: "7px 18px"
  card:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px 20px"
  lead-card:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "18px 20px 20px"
  input:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
    padding: "10px 14px"
    height: "48px"
  tabbar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink3}"
    height: "58px"
  tabbar-current:
    textColor: "{colors.seal}"
  question-card:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.question}"
    rounded: "{rounded.paper}"
    padding: "28px 26px 30px"
  seal-stamp:
    backgroundColor: "{colors.seal}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.seal}"
    size: "52px"
  jangwon-seal:
    backgroundColor: "{colors.hong-deep}"
    textColor: "#FBE9E2"
    rounded: "{rounded.seal}"
    size: "76px"
---

# Design System: 오늘의 책문

## Overview

**Creative North Star: "오늘 아침 배달된 시험지"**

화면의 뼈대는 요즘 뉴스 앱이다. 큰 이미지 카드 하나와 썸네일 목록, 굵은 헤드라인, 위에 붙는 반투명 머리, 아래에 고정된 탭 바, iOS 세그먼트와 입력 묶음. 과거 시험장은 이 뼈대 위에 재료로만 들어온다. 한지 미색 바탕과 옅은 섬유 질감, 먹색 글씨, 주홍 낙관 하나. 문양을 화면 가득 까는 사극 세트가 아니라, 읽기 편한 앱에 종이와 인주가 묻어 있는 정도다.

밀도는 모바일 한 단 기준으로 여유 있게 잡는다. 긴 한국어 글을 읽고 쓰는 화면이므로 본문 줄 간격은 1.75에서 1.95까지 넉넉하고, 붓글씨 명조는 큰 제목과 시제(오늘의 질문)에만 쓴다. 나머지 모든 글은 Pretendard다. 기본 장식은 모두 CSS로 만든 한지 섬유, 잡음 마스크로 인주가 덜 묻은 듯한 인장, 아주 옅은 세로 괘선이다. 여기에 v4.2 원본에서 가져온 전통 장식 네 가지(단청 띠, 창살 띠, 꺾쇠, 테두리 策問 인장)를 정해 둔 자리에만 더한다. 자세한 규칙은 아래 "전통 장식"에 있다.

라이트 모드만 있다. 시연 화면이 기기 설정에 따라 바뀌지 않게 `color-scheme: light`로 고정한다.

**Key Characteristics:**
- 뉴스 앱 골격 + 과거 시험 재료(한지, 먹, 낙관)
- 포인트 색은 낙관 주홍 하나, 홍패 붉은색은 장원 패널에만
- Song Myung은 큰 제목과 시제에만, 나머지는 Pretendard
- 세로 괘선은 표지, 시제 카드, 답안지 여백, 첫 화면 머리에만
- 인장은 잡음 마스크로 찍히고, 화면에 들어올 때 찍히듯 나타난다
- 전통 장식은 정해진 자리에만: 맨 위 단청 띠 한 줄, 머리 아래와 큰 구획 사이의 창살 띠, 중요한 카드의 꺾쇠, 첫 화면의 테두리 策問 인장
- 매일 돌아오게 하는 장치도 인장으로 말한다: 연속 응시 달력, 급제 길 5칸, 먹색 "다음 책문의 과제" 카드

## Colors

따뜻한 미색 종이와 먹의 단계 위에, 주홍 낙관 하나가 현재 위치와 행동을 가리키는 팔레트다.

### Primary
- **낙관 주홍** (`seal`): 인장에만 쓴다. 글자 강조에는 쓰지 않는다. 쓰는 곳: 진행선의 현재 칸, 연속 응시의 쓴 날, 급제 길의 채운 칸, "오늘의 과제" 라벨, 그리고 도장 자체인 것(策 로고, 問 인장, 첫 화면 策問 테두리 인장, 광장의 "내 글" 인장과 배지). 포커스 링과 입력 커서도 접근성 때문에 주홍. 링크, 로그아웃, 탭 바 현재 탭, 분야 이름, 점수 강조는 모두 먹(`ink`)이다.
- **짙은 주홍** (`seal-deep`): 링크 hover와 오류 문구.
- **주홍 엷은 바탕** (`seal-t`): 텍스트 선택, 대필 거절 말풍선, 막힘 안내, 광장의 내 글 바탕, 고쳐 쓰기 비교의 지운 글자.

### Secondary
- **홍패 분홍** (`hong`): 장원 패널의 위쪽 6px 띠.
- **홍패 붉은색** (`hong-deep`): 장원 패널의 이중 테두리(3px double, 55% 불투명)와 壯元 인장 면. 장원 패널 밖에서는 쓰지 않는다.

### Neutral
- **한지 미색** (`paper`): 페이지 바탕. 항상 `--fiber` 섬유 질감과 함께 깐다. 머리와 탭 바는 이 색의 90%대 반투명 + 흐림.
- **짙은 한지** (`paper-2`): 세그먼트 바닥, 안내 상자, 반론 카드의 마지막 줄, 예시 배지.
- **밝은 종이** (`sheet`): 카드, 시제 카드, 답안지, 먹색 버튼 위 글자.
- **먹** (`ink`): 본문, 헤드라인, 주요 버튼 면, 완료된 단계, 진행선.
- **옅은 먹** (`ink2`): 요약, 보조 문단, 세그먼트 비선택 글자.
- **흐린 먹** (`ink3`): 메타, 출처, 날짜, 탭 바 비선택, 화살표 꺾쇠.
- **괘선** (`rule`), **짙은 괘선** (`rule-2`): 카드 테두리와 목록 구분선, 입력 테두리와 고스트 버튼 테두리.
- **표지 바탕** (`cover-ground`): 사진이 없을 때 CSS 표지의 종이색과 안쪽 테 색.

### 단청 띠와 나무 축 (자리 한정)
- **단청 청·황·녹** (`dc-blue`, `dc-yellow`, `dc-green`) + 적(`seal`) + 흰 마디(`sheet`): 화면 맨 위 5px 단청 띠 한 줄에서만 쓴다. 다른 어떤 요소의 강조에도 빌려 쓰지 않는다.
- **나무 축** (`wood`, `wood-2`): 광장 방(榜) 두루마리의 위아래 축 그라데이션에만.

### Named Rules
**The One Seal Rule.** 포인트 색은 낙관 주홍 하나다. 파란색, 초록색, 호박색 같은 두 번째 강조색을 들이지 않는다(v4.4: 앱 안의 파랑, 초록 바탕은 모두 한지, 먹, 주홍으로 바꿨다). 고쳐 쓰기 비교에서 더한 글자는 짙은 한지(`paper-2`) 바탕에 먹 밑줄, 지운 글자는 `seal-t`. 예외는 둘: 맨 위 단청 띠의 단청 색(청색 포함), 방 두루마리의 나무 축.

**The 홍패 Rule.** 홍패 붉은색(`hong`, `hong-deep`)은 광장의 장원 패널에만 있다. 다른 화면에서 "특별함"을 표시하려고 빌려 쓰지 않는다.

## Typography

**Display Font:** Song Myung (AppleMyungjo, Noto Serif KR, Batang 순 대체)
**Body Font:** Pretendard Variable (Apple SD Gothic Neo, Malgun Gothic 순 대체)

**Character:** 붓으로 쓴 듯한 명조가 시험장의 목소리를 맡고, 굵은 Pretendard가 뉴스 앱의 목소리를 맡는다. 둘은 섞이지 않고 역할이 나뉜다.

### Hierarchy
- **Display** (Song Myung 400, `clamp(2.1rem, 8vw, 2.8rem)`, 1.2): 첫 화면 큰 제목.
- **Headline** (Song Myung 400, `clamp(1.85rem, 6.2vw, 2.35rem)`, 1.25): 화면 제목(기사 고르기의 "시관이 고른 오늘의 시제(試題) 다섯", 로그인 제목 등).
- **Question** (Song Myung 400, `clamp(1.36rem, 4.6vw, 1.62rem)`, 1.6): 시제 카드 안의 질문. 작은 시제 카드에서는 1.14rem.
- **News headline** (Pretendard 800, `clamp(1.38rem, 5vw, 1.62rem)`, 1.32, -0.03em): 큰 카드 헤드라인과 기사 제목(1.42~1.72rem). 목록 헤드라인은 1.04rem 같은 굵기.
- **Title** (Pretendard 700, 1.18rem, 1.4): 구획 제목.
- **Body** (Pretendard 400, 16px, 1.75): 기본 글. `word-break: keep-all`로 어절 단위 줄바꿈.
- **Reading** (Pretendard 400, 1.04~1.06rem, 1.85~1.95): 기사 원문, 반론, 답안지. 길게 읽고 쓰는 곳은 줄 간격을 더 연다.
- **Label** (Pretendard 500~700, 0.7~0.86rem): 메타, 출처, 탭 바 글자, 배지. 대문자 변환이나 넓은 자간 없음.

### Named Rules
**The Two Voices Rule.** Song Myung은 큰 제목, 시제 질문, 인장과 표지의 한자, 방 기둥의 세로쓰기 그룹 이름, 먹색 카드의 "내일 이 과제로 다시 오세요" 한 줄에만 쓴다. 헤드라인, 버튼, 본문, 숫자는 모두 Pretendard다.

**The Byline Below Rule.** 헤드라인 위에 작은 라벨(분야, 출처, 단계 이름)을 얹지 않는다. 분야와 출처, 날짜는 헤드라인 아래 메타 줄로 내린다.

## Layout

모바일 우선 한 단. 본문 단은 최대 720px, 좌우 여백은 16px(안전 영역이 더 크면 그만큼). 데스크톱에서도 단을 넓히지 않고 가운데에 둔다. 탭 바가 있는 화면은 아래 여백을 탭 바 높이(58px) + 48px만큼 띄운다.

흐름은 위에서 아래로: 고정된 머리(작은 策 낙관, 오늘의 책문, 날짜, 오른쪽 계정) → 6단계 진행선 → 화면 제목 → 내용 → 고정 탭 바. 구획 간격은 40px, 구획 안 제목 아래는 14px.

기사 고르기는 위에서부터 (기관 학생) 이번 주 과제, 오늘의 과제(맨 위 한 줄에 연속 응시), 화면 제목(1.42~1.85rem으로 다른 화면 제목보다 작게), 기사 다섯 순서다. 390×844에서 첫 기사 카드 윗부분이 첫 화면에 보여야 한다. 기사 다섯은 모두 같은 크기 카드이고, 휴대폰은 한 줄에 1개, 660px 이상은 한 줄에 2개(마지막 1개는 왼쪽 정렬)다. 600px 이하에서는 두 갈래 선택, 난이도 카드, 차트 칸이 한 열로 접힌다.

## Elevation & Depth

종이를 겹친 정도의 낮은 그림자 하나와 반투명 흐림 두 곳만 쓴다. 깊이는 대부분 바탕색의 단계(`paper` 위 `sheet`)와 1px 괘선으로 만든다.

### Shadow Vocabulary
- **종이 그림자** (`box-shadow: 0 1px 2px rgba(58,40,22,.06), 0 8px 22px -12px rgba(58,40,22,.22)`): 카드, 시제 카드, 답안지, 장원 패널, 입력 묶음.
- **세그먼트 손잡이** (`box-shadow: 0 1px 3px rgba(58,40,22,.14), 0 0 0 .5px rgba(58,40,22,.08)`): 선택된 세그먼트 칸.
- **토스트** (`box-shadow: 0 10px 30px -10px rgba(30,20,10,.5)`): 먹색 알림 캡슐.
- **유리 머리와 탭 바** (`backdrop-filter: saturate(1.3) blur(16~18px)`, 0.5px 괘선): iOS 내비게이션 바와 탭 바.

### Named Rules
**The Paper Stack Rule.** 그림자는 부드럽고 아래로만 떨어진다. 딱딱한 오프셋 그림자나 색 그림자는 쓰지 않는다.

## Shapes

뉴스 앱의 둥근 카드(16px, 큰 카드와 입력 묶음은 20px)와 시험지의 각진 종이(6px)가 역할로 나뉜다. 시험에 속한 것(시제 카드, 답안지, 장원 패널)은 6px의 거의 각진 종이에 안쪽 7px 들여 그은 가는 테를 두르고, 앱에 속한 것(카드, 목록, 입력)은 둥글다. 버튼, 배지, 투표, 말풍선은 완전한 캡슐(999px). 인장은 4px 모서리에 -3도에서 -5도 기울어져 있고, `--stamp` 잡음 마스크로 가장자리와 면에 잔 구멍이 난다.

**The Ruled Lines Rule.** 세로 괘선은 다섯 곳에만 있다. CSS 표지(36px 간격), 시제 카드(42px 간격, 7.5% 불투명), 답안지 왼쪽 여백(12px 간격 + 이중선), 첫 화면 머리(38px 간격, 가운데로 흐려지는 마스크), 광장 방의 기둥 사이 1px 선. 카드나 페이지 바탕 전체에 깔지 않는다.

## Components

### Buttons
- **Shape:** 캡슐 (999px), 높이 50px.
- **Primary:** 먹색 면에 밝은 종이색 글자, Pretendard 700 1rem, 좌우 26px. hover는 `#2E2822`, 누르면 0.97배로 줄어든다.
- **Ghost:** 투명 면, 먹색 글자, `rule-2` 테두리. hover에서 `sheet` 면과 `ink3` 테두리.
- **Link:** 주홍 글자, 1px 밑줄(5px 띄움), 높이 확보용 위아래 10px. 보조 행동은 버튼 대신 이 링크를 쓴다.
- **Focus:** 모든 조작 요소에 주홍 2px 외곽선, 3px 띄움.

### Segmented Control
iOS 세그먼트. `paper-2` 바닥(11px 모서리, 3px 안쪽 여백) 안에서 선택된 칸만 `sheet` 면과 세그먼트 손잡이 그림자를 얻고 700으로 굵어진다. 로그인/가입, 광장 보기 전환에 쓴다.

### Chips
투표와 빠른 질문은 38px 높이 캡슐(`sheet` 면, `rule-2` 테두리), 눌린 투표는 먹색 면. 배지는 0.72rem 700 캡슐: 예시(`paper-2`), 내 글(주홍), 기관(먹).

### Cards / Containers
- **Corner Style:** 16px (큰 카드, 입력 묶음, 반론 카드는 20px)
- **Background:** `sheet`
- **Shadow Strategy:** 종이 그림자. 목록 안 하위 카드는 그림자 없이 괘선만.
- **Border:** `rule` 1px, 강조된 종이(반론, 학생 글)는 `rule-2`.
- **Internal Padding:** 14~22px.

### Inputs / Fields
흰 면(#FFFFFF), `rule-2` 1px 테두리, 12px 모서리, 높이 48px. 포커스에서 테두리가 먹색이 되고 주홍 18% 고리(3px)가 둘러진다. 질문 입력은 캡슐 모양. 오류는 `seal-deep` 글자.

### Navigation
- **머리:** 맨 위에 5px 단청 띠(고정), 그 아래 붙어 있는 반투명 한지(90%) + 흐림, 아래 0.5px 괘선. 왼쪽에 30px 策 낙관과 Song Myung 1.4rem "오늘의 책문". 머리 바로 아래에 창살 띠 한 줄.
- **진행선:** 6칸 격자, 27px 각진 번호 칸 사이 1.5px 선. 완료 칸은 먹색, 현재 칸은 주홍 인장(-4도, 마스크, Song Myung 숫자).
- **하단 탭 바:** 고정, 58px, 반투명 한지 + 흐림, 3칸(책문, 광장, 나의 기록 / 교수는 우리 반). 25px 선 아이콘(1.6 굵기)과 0.7rem 글자, 현재 탭은 주홍과 1.9 굵기. 첫 화면과 로그인 화면에서는 숨긴다.

### 기사 카드와 표지 (Signature)
기사 다섯은 같은 크기 카드다. 굵은 헤드라인(1.14rem 800), 두 줄로 자른 요약, 메타 줄(주홍 분야 이름 + 흐린 출처와 날짜), "읽기" 화살표 순서. 사진이 없으면 글자만 있는 카드이고, 오른쪽 위 구석에 38px 분야 한자 낙관(社 經 敎 科 環)을 먹색 2px 테두리 인장으로 찍는다(헤드라인 위 라벨이 아니라 구석 인장). 사진이 있으면 카드 위에 16:9로 꽉 채운다. 기사 읽기 화면도 같은 규칙이다: 사진이 있으면 맨 위 16:9 사진, 없으면 표지 없이 바로 제목. 기사에 `image`가 있으면 사진을 꽉 채우고 `sepia(.32) saturate(.78) contrast(.96) brightness(1.02)`로 살짝 바래게 한 뒤 섬유 질감을 곱하기로 얹고, `imageCredit`을 아래에 0.7rem으로 단다(썸네일은 출처 생략). 

### 시제 카드 (Signature)
6px 종이, `rule-2` 테두리, 안쪽 7px 들여 그은 테, 옅은 세로 괘선. 왼쪽에 52px 問 인장(모바일 42px), 오른쪽에 Song Myung 질문.

### 답안지 (Signature)
`sheet` 면 textarea, 6px 모서리, 왼쪽 30px 여백에 12px 간격 괘선과 이중 세로선, 글은 50px부터 1.06rem/1.95. 포커스에서 주홍 14% 고리.

### 장원 패널 (Signature)
홍패. `sheet` 면에 섬유 질감, 위쪽 6px `hong` 띠, 안쪽 7px에 `hong-deep` 3px 이중 테. 76px 壯元 인장(`hong-deep` 면, 안쪽 흰 테, 아래 작은 "장원"). 어람작은 같은 자리에 주홍 없이 `rule-2` 점선 테만 둔다.

### 전통 장식 (v4.3, 자리 한정)
v4.2 원본의 장식을 새 팔레트로 옮겨 아래 자리에서만 쓴다. 다른 곳에 늘리지 않는다.
- **단청 띠:** 화면 맨 위에 고정된 5px 한 줄. 청 28px, 적 21px, 황 15px, 녹 28px를 3px 흰 마디로 나눠 되풀이한다. 단청 색은 이 띠에서만.
- **로고:** 策 낙관을 유지한다. v4.2의 꽃 문양(원형 문양) 로고는 쓰지 않는다. 이유: 서비스 이름과 은유("책문")를 바로 읽히게 하는 것은 策 한 글자이고, 진행선, 問, 壯元까지 이어지는 인장 언어와 한 식구다. 꽃 문양은 30px에서 일반적인 꽃 장식으로 읽히고, 금빛 선이라 팔레트 밖의 색을 하나 더 들인다. 바로 위에 단청 띠가 있어 머리에 장식이 둘이면 붐빈다.
- **창살 띠:** 18px 격자 무늬 한 줄(`ink3` 선, 34% 불투명). 머리 바로 아래 한 곳과, 큰 구획이 바뀌는 곳(광장의 방과 장원 사이, 나의 기록의 달력과 급제 길 다음)에만. 한 화면에 두 줄을 넘기지 않는다.
- **꺾쇠:** 왼쪽 위와 오른쪽 아래에 16px ㄱ자 선(1.5px, `ink3` 60%). 첫 화면의 두 갈래 시작 카드, 오늘의 과제 카드(기사 고르기, 쓰기 화면), 이번 주 과제 카드, 먹색 다음 책문의 과제 카드(한지색 55%)에만. 로그인 상자, 난이도 카드, 학생 글 카드에는 두르지 않는다. 가상 요소가 아니라 배경 그라데이션으로 그려 다른 장식과 겹치지 않는다.
- **테두리 策問 인장:** 첫 화면 대표 인장만 면을 칠하지 않고 3px 주홍 테두리 + 주홍 글자 + 5% 주홍 바탕으로 둔다. 다른 인장(策 로고, 問, 壯元, 분야 낙관)은 면이 칠해진 인장이다.

### 연속 응시와 급제 길 (v4.3)
- **연속 응시:** 따로 카드를 두지 않고 오늘의 과제 카드 맨 위 한 줄에 둔다. "연속 N일째 응시"(먹), 15px 칸 일곱 개(쓴 날은 주홍 인장, 안 쓴 날은 `rule-2` 점선, 비어 있는 오늘은 `ink3` 점선, 깜빡이지 않음), 오늘이 비면 오른쪽 끝에 작게 "오늘 빈칸"(화면 낭독기에는 "오늘 칸이 비어 있습니다"). 나의 기록에는 32px 칸의 한 달 달력.
- **급제 길 (v4.4, main 11/20 과제 단계 없음에 맞춤):** 기준마다 한 칸, 모두 5칸(쟁점, 근거, 맥락, 입장, 결론). 해낸 칸은 주홍 인장, 이번 과제 칸은 먹 점선, 남은 칸은 `rule-2` 점선, 칸 사이는 12px 선(해낸 칸 뒤는 주홍). 오늘의 과제 카드 아래에 5칸 한 줄과 "급제 길 N/5". 나의 기록에서는 기준마다 한 줄(기준 이름, 과제 제목, 오른쪽에 해냄/오늘/빈칸 칸).
- **다음 책문의 과제 카드:** 먹(`ink`) 바탕, 한지색 글씨의 큰 카드. 라벨은 한지색, 제목은 1.3~1.55rem 800, 급제 길 5칸, 마지막 줄 Song Myung "내일 이 과제로 다시 오세요". "광장에 제출하기" 버튼 바로 위.

### 광장 방(榜) (Signature)
합격자 명단을 붙인 두루마리. 흰 상자가 아니라 짙은 한지(`paper-2`) 바탕에 섬유 질감, 안쪽 `rule-2` 테, 위아래 14px 나무 축. 가운데 위에 Song Myung "榜". 논거 그룹마다 세로 기둥 하나: 그룹 이름은 세로쓰기(`writing-mode: vertical-rl`), 아래에 인원수만큼 작은 먹색 인장, 그 아래 인원수. 내 글이 속한 그룹은 인장 하나가 주홍이고 "내 글"이 붙는다. 인원 많은 기둥부터 오른쪽에 붙인다(세로쓰기 읽는 방향). 소수의견 기둥 위에는 테두리만 있는 작은 "少". 기둥은 남은 폭을 나눠 가져 그룹이 적어도 비어 보이지 않고, 휴대폰에서도 가로 스크롤 없이 한 화면에 들어간다. 기둥을 누르면 그 그룹 답안 목록으로 내려간다.

### Motion
화면 전환은 아래에서 8px 떠오르며 나타난다(0.42s, `cubic-bezier(.16,1,.3,1)`). 問 인장, 壯元 인장, 첫 화면 策問 인장은 1.5배 크기에서 -12도로 내려와 찍힌다(0.55s, 0.12s 늦게). 진행선은 0.5s로 늘어난다. 움직임 줄이기 설정에서는 모두 끈다.

## Do's and Don'ts

### Do:
- **Do** 페이지 바탕은 항상 `paper` + `--fiber` 섬유 질감으로 깐다.
- **Do** 주홍은 인장으로만 쓴다: 현재 단계, 쓴 날, 채운 칸, 오늘의 과제 라벨, 策 로고, 問, 내 글. 글자 강조(링크, 현재 탭, 분야 이름, 점수)는 먹으로 한다.
- **Do** 주요 행동은 먹색 캡슐 버튼 하나, 보조 행동은 주홍 밑줄 링크로 둔다.
- **Do** 분야, 출처, 날짜, 글쓴이는 헤드라인 아래 메타 줄에 둔다.
- **Do** 기사 사진은 세피아 필터와 섬유 질감을 입히고 아래에 출처를 단다. 사진이 없으면 기사 카드는 글자만 두고 구석에 분야 한자 낙관을 찍는다.
- **Do** 전통 장식은 "전통 장식"에 적힌 자리에서만 쓴다.
- **Do** 인장은 CSS 면 + `--stamp` 마스크 + 살짝 기울임으로 만들고, 들어올 때만 찍히는 움직임을 준다.
- **Do** 터치 영역은 44px 이상(버튼 50px, 입력 48px, 탭 58px)으로 둔다.

### Don't:
- **Don't** 헤드라인 위에 작은 라벨(분야명, "오늘의 시제", 단계 이름 같은 머리말)을 얹지 않는다.
- **Don't** 파란색, 초록색, 호박색 같은 두 번째 강조색을 쓰지 않는다. 바탕 상자는 한지(`sheet`, `paper-2`), 강조는 먹과 주홍만. 단청 띠만 예외다.
- **Don't** 홍패 붉은색을 장원 패널 밖에서 쓰지 않는다.
- **Don't** Song Myung을 헤드라인, 버튼, 본문, 숫자에 쓰지 않는다.
- **Don't** 세로 괘선을 표지, 시제 카드, 답안지 여백, 첫 화면 머리, 방 기둥 밖에 깔지 않는다.
- **Don't** 단청 색을 맨 위 띠 밖에서 쓰지 않는다. 창살 띠를 한 화면에 두 줄 넘게, 꺾쇠를 모든 카드에 두르지 않는다.
- **Don't** 민화, 구름무늬, 팔각 문양, 두루마리 막대를 시제 카드에 다시 들이지 않는다. 화면 가득 문양을 깔아 사극 세트처럼 무겁게 만들지 않는다.
- **Don't** 분위기 사진(mood)을 앱 안에 넣지 않는다. 장식은 모두 CSS로 만든다.
- **Don't** 다크 모드를 만들지 않는다.
