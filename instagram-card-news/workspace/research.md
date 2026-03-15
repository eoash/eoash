# Research: Claude Code 비용 81% 줄이는 설정법

## 핵심 포인트

1. **opusplan 모델**: Plan Mode는 Opus 4.6, 실행 단계는 Sonnet 4.6 자동 전환. 코드 작성 단계에서 불필요한 Opus 사용 차단. settings.json에 `"model": "opusplan"` 한 줄로 설정.

2. **실제 비용 비교**: 동일 작업(43만 토큰) 기준 — 전부 Opus: $14.21 / 모델 분리 후: $2.74 → **81% 절감**. 매달 사용 기준 월 $252(약 36만원) 절약.

3. **effortLevel auto**: Claude가 작업 복잡도를 판단해 추론 깊이 자동 조절. 단순 질문엔 low, 복잡한 설계엔 high. 불필요한 thinking 토큰 소모 방지.

4. **프롬프트 모델 직접 지정**: `[haiku]` `[sonnet]` `[opus]` 별칭으로 태스크별 모델 병렬 실행. 파일 탐색 → Haiku, 코드 리뷰 → Sonnet, 아키텍처 설계 → Opus.

5. **Explore 서브에이전트**: Claude Code 기본 파일 탐색 에이전트는 이미 Haiku 사용 중. 추가 설정 없이 단순 탐색은 자동으로 저렴하게 처리.

6. **/loop 커맨드**: 반복 모니터링 자동화. 간격 지정 후 동일 프롬프트 반복 실행. 스케줄러와 달리 Claude 세션 내 대화형으로 동작.

7. **Prompt Cache**: 대화가 길수록 반복 컨텍스트 90% 할인. 10회 호출 기준 71,000 → 14,300 토큰 (80% 절감).

8. **worktree + sparsePaths**: `claude -w`로 필요한 폴더만 체크아웃. 병렬 작업 시 파일 충돌 없이 두 기능 동시 개발 가능.

## 핵심 통계

- Opus 단독 vs 모델 분리: **81% 비용 절감** (실측)
- 처리 시간: 18분 → 10분 단축
- Prompt Cache: 10회 호출 시 **80% 토큰 절감**
- 월 예상 절약: **$252 (약 36만원)**

## 인용

> "같은 결과, 다른 비용. 설정 두 줄로 Opus를 80% 덜 쓴다." — Claude Code v2.1.76

## 핵심 설정 (settings.json)

```json
{
  "model": "opusplan",
  "effortLevel": "auto"
}
```
