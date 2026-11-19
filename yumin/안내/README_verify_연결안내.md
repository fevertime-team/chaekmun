# 검수 지시문(verify) 연결 안내 — 형준용

`prompts/verify.txt`와 `prompts/verify.schema.json`을 `prompts/` 폴더에 넣고, `/api/verify`(또는 `/api/pipeline`의 검수 단계)가 쓰게 해 주세요.

## 1. 전체 흐름 (pipeline)
```
반론 생성(feedback) ─▶ ① 규칙 검사(코드) ─▶ ② 검수(verify, Claude) ─▶ 통과하면 화면에 표시
        ▲                    │ 걸림                  │ block 있음
        └──── 재생성 (최대 2번 더, 총 3번) ◀──────────┘
                3번 다 실패하면: 예비 반론(articles-v2.ts의 bank)으로 대체하고 로그에 표시
```

## 2. ① 규칙 검사 (코드, 무료·즉시)
목업의 규칙 검사를 그대로 쓰고, 아래 하나를 더해 주세요.
| 검사 | 방법 |
|---|---|
| 금지 표현 | "양쪽 다 일리", "균형", "절충", "모범 문장", "이렇게 고쳐", "~라고 쓰면", "예를 들어 다음과 같이" |
| 고쳐 쓴 흔적 | 피드백 문장과 사용자 문장의 글자 겹침(목업의 jaccard)이 0.5 이상이면서 사용자 문장과 똑같지는 않은 경우 |
| **(추가) 지어낸 숫자** | 피드백에 나온 숫자가 기사 요약과 사용자 답안 어디에도 없으면 의심 표시 |

규칙 검사에서 걸린 것은 **바로 재생성하지 말고**, ② 검수에 "의심 항목"으로 함께 넘겨 Claude가 최종 판정하게 해 주세요. (글자 겹침은 정상적인 인용·요약도 잡기 때문입니다)
- 방법: `{{feedback_json}}` 아래에 `# 규칙 검사 의심 항목` 목록을 덧붙이면 됩니다.

## 3. ② 검수 호출
- 모델: 환경변수 `VERIFY_MODEL` (기본 **Haiku**). 테스트에서 놓치는 게 많으면 Sonnet으로 올립니다.
- 답 형식: `output_config.format`에 `verify.schema.json`
- `{{feedback_json}}`: Claude가 낸 원본 JSON에서 화면에 보일 글만 추려서 넣어 주세요.
  `structure.premise`, `structure.premise_from`, `structure.claim_index`, `weaknesses[]`, `rebuttal.text`, `rebuttal.question`, `rebuttal.source_line`
- `{{article_lines}}`, `{{question}}`, `{{answer_sentences}}`: feedback과 같은 값

## 4. 서버 보정
- `pass`는 Claude 값을 믿지 말고 **서버가 다시 계산**: `violations` 중 severity가 block인 것이 하나도 없으면 통과
- `evidence`가 피드백 글 안에 실제로 없으면 그 위반은 버림 (Claude가 없는 문제를 지어낸 것)
- warn은 재생성하지 않고 로그에만 남김

## 5. 재생성할 때
feedback.txt의 `{{retry_note}}` 자리에 아래처럼 넣어 주세요. 첫 생성 때는 빈 문자열입니다.
```
# 직전 출력이 검수에서 걸린 이유 (이번에는 반드시 피할 것)
- [B] rebuttal.question: "작은 가게 사정을 생각하면 기업 부담만으로는 어렵지 않을까요?" → 질문 안에 답이 들어 있는 유도 질문
```

## 6. 화면의 '처리 과정'에 보여 줄 것
- 생성 → 규칙 검사 → 검수 → (걸리면) "걸러냄: 유도 질문" → 재생성
- 검수 기록은 가드레일 테스트 수치의 근거가 됩니다. 요청마다 `{시도 횟수, 걸린 type들, 최종 통과 여부}`를 로그로 남겨 주세요.

## 7. 테스트 후 보내 줄 것 (유민에게)
feedback 테스트 3개의 검수 결과 JSON을 함께 보내 주세요. 특히 **통과했는데 이상해 보이는 것**, **걸렸는데 멀쩡해 보이는 것**이 있으면 표시해 주세요.
