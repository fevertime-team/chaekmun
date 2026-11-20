---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# 오늘의 책문 앱 화면 (index.html)

Scope: 앱 전체 화면(첫 화면, 로그인, 기사 고르기, 난이도, 질문, 쓰기, 반론, 고쳐 쓰기, 광장, 나의 기록, 교수 화면). Mode: Operate (휴대폰에서 매일 한 편 쓰는 작업 화면). Build path: code-led.

Audience and job: 대학생이 기사 하나를 골라 읽고, 질문에 직접 답하고, 반론을 받아 고쳐 쓰고, 광장에서 다른 답을 읽는다. 심사위원은 URL을 설명 없이 누른다.
Constraints: 기능, 화면 구조(6단계 흐름), 화면 문구는 그대로. 하단 탭 바(책문, 광장, 나의 기록 / 교수는 우리 반) 추가. ARTICLES에 image, imageCredit 칸 추가, 비어 있으면 CSS 표지. mood 사진은 쓰지 않음. 다크 모드 끔.

## Direction contract

THESIS: 오늘의 책문은 오늘의 시험 문제다. 화면은 요즘 뉴스 앱의 골격(큰 카드, 굵은 헤드라인, 하단 탭, iOS 컨트롤)으로 읽히고, 과거 시험은 한지 바탕, 먹 글씨, 주홍 낙관으로만 들어온다. 사극 세트처럼 문양을 깔아 덮는 화면을 거부한다.
OWN-WORLD: 한지 미색 바탕(옅은 섬유 질감), 먹색 글, 더 밝은 종이 카드. 포인트는 낙관 주홍 한 가지(현재 탭, 현재 단계, 링크, 問 인장, 내 글 표시). 홍패 붉은색은 장원 패널에만. 큰 제목만 Song Myung, 본문과 헤드라인은 Pretendard 굵게. 주요 버튼은 먹색 캡슐. 세로 괘선은 표지, 시제 카드, 답안지 여백에만 은은하게.
STORY: 들어오면 오늘의 시제 다섯이 뉴스 첫 면처럼 보이고, 하나를 골라 읽고, 시험지에 답안을 쓰고, 시관의 반론을 받아 고친 뒤, 광장에서 장원 인장이 찍힌 글을 본다.
FIRST VIEWPORT: (기사 고르기) 위에 고정된 머리(작은 策 낙관 + 오늘의 책문 + 날짜, 오른쪽 계정), 그 아래 6단계 진행선. 큰 제목 "시관이 고른 오늘의 시제(試題) 다섯"(Song Myung), 첫 기사는 16:10 큰 카드(사진 또는 분야 한자 표지 + 낙관) 아래 굵은 헤드라인과 한 줄 요약, 나머지 넷은 정사각 표지 썸네일 목록. 하단 탭 바 고정, 책문 탭이 주홍.
FORM: 사용자가 고정한 방향(뉴스 앱 골격 + 과거 시험 분위기). seed: none (pinned) "요즘 뉴스 앱처럼 큰 이미지 카드, 굵은 헤드라인, 하단 탭 바, iOS 컴포넌트 규칙을 따라 줘", "조선시대 과거 시험과 장원급제 느낌", "색: 한지 미색 바탕, 먹색 글씨, 포인트는 낙관 같은 주홍색 한 가지". Signature move: CSS로 찍은 낙관 인장(시제의 問, 현재 단계, 광장의 壯元)이 찍히듯 나타나는 순간.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Unresolved: 기사 사진 주소(팀이 나중에 채움). 광장 탭은 기사를 고르기 전이면 기사 고르기로 보냄.
