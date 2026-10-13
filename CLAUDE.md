# 서브 에이전트 모델 규칙

| 작업 | 에이전트 | 모델 |
|---|---|---|
| 설계, 어려운 로직 (물리, AI) | `architect` | opus (필요 시 fable로 지정) |
| 일반 모듈 구현 | `implementer` | sonnet |
| 파일 탐색, 단순 반복 작업 | `scout` | haiku |

- 서브 에이전트를 쓸 때는 위 표에 맞는 에이전트를 고른다.
- 기본 에이전트(general-purpose 등)를 쓸 경우에도 `model`을 위 표대로 지정한다.
