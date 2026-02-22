# 계획서: Skills 자동 활성화 Hook

> 생성일: 2026-02-22
> 상태: 승인됨

## 목표
사용자가 프롬프트를 입력하면, 키워드·의도 패턴을 분석해서 관련 스킬을 자동으로 Claude 컨텍스트에 추천하는 시스템.

## 현재 상황
- 훅: SessionStart(git log) + UserPromptSubmit(첫 메시지 context-sync만) 2개 존재
- 스킬: 유저 레벨 11개 + 프로젝트 레벨 18개 = 총 29개
- 문제: 스킬이 많지만 사용자가 직접 `/스킬명`을 기억하고 호출해야 함

## 범위
### 포함
- UserPromptSubmit 훅으로 매 프롬프트 분석
- skill-rules.json 매칭 규칙 파일 (키워드 + 의도 패턴 + URL 패턴)
- skill_activation.py 매칭 스크립트
- settings.json 업데이트
- 중복 추천 방지

### 미포함
- 작업 위치(PreToolUse) 기반 매칭 → 추후
- 파일 내용 기반 매칭 → 추후
- 자동 실행 → 추천만, 실행은 Claude 판단

## 단계별 작업
### 1단계: skill-rules.json 작성
### 2단계: skill_activation.py 작성
### 3단계: settings.json 업데이트
### 4단계: 테스트

## 예상 결과물
| 파일 | 위치 |
|------|------|
| skill-rules.json | ~/.claude/hooks/skill-rules.json |
| skill_activation.py | ~/.claude/hooks/skill_activation.py |
| settings.json | ~/.claude/settings.json (수정) |

## 리스크
- 모든 프롬프트마다 실행 → 100ms 이내 목표
- 오탐 최소화
- 기존 first_message.py와 충돌 없어야 함
