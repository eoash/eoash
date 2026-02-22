# 맥락 노트: Skills 자동 활성화 Hook

> 생성일: 2026-02-22
> 마지막 업데이트: 2026-02-22 23:50

## 현재 상황 분석
- UserPromptSubmit: stdin으로 {"prompt": "..."} 받음, stdout이 Claude 컨텍스트에 자동 주입
- matcher 지원 안 됨 (항상 실행), 여러 훅 병렬 실행

## 관련 파일 & 자료
| 파일/자료 | 위치 | 역할 |
|-----------|------|------|
| settings.json | ~/.claude/settings.json | 훅 등록 |
| session_start.py | ~/.claude/hooks/session_start.py | 기존 세션시작 훅 |
| first_message.py | ~/.claude/hooks/first_message.py | 기존 첫 메시지 훅 |
| Hooks 공식 문서 | https://code.claude.com/docs/en/hooks | 스펙 |
| Skill Activation 레퍼런스 | https://claudefa.st/blog/tools/hooks/skill-activation-hook | 패턴 |
| 인프라 쇼케이스 | https://github.com/diet103/claude-code-infrastructure-showcase | Reddit 원본 |

## 결정 사항
| 결정 | 이유 | 기각한 대안 |
|------|------|-------------|
| UserPromptSubmit 훅 | prompt 텍스트 직접 분석 가능 | PreToolUse (프롬프트 없음) |
| 키워드+의도 패턴만 Phase 1 | 80% 커버, 구현 간단 | 4가지 동시 (과도) |
| JSON 규칙 파일 분리 | 규칙 추가 쉬움 | 하드코딩 |
| 추천만, 자동 실행 안 함 | 오탐 시 안전 | 자동 Skill 호출 |
| Python, 표준 라이브러리만 | 기존 훅과 통일, 외부 의존성 없음 | Bash |

## 의존성
- Python 3, json/re/sys 표준 라이브러리만

## 참고 메모
- plain text stdout도 컨텍스트 주입됨 (JSON 필수 아님)
- 여러 UserPromptSubmit 훅 병렬 실행 → first_message.py 충돌 없음
- [발견] 훅이 현재 세션에서 즉시 적용됨 (공식 문서는 "다음 세션부터"라고 하지만 실제로 바로 동작 확인)
- [해결] prompt 필드에 시스템 태그 포함 → false positive 발생 → `skill_activation.py`에 regex 전처리 추가하여 해결 (`<system-reminder>`, `<task-notification>`, 일반 XML 태그 제거)
