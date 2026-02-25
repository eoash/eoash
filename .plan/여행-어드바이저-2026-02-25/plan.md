# 계획서: 여행 어드바이저 에이전트

> 생성일: 2026-02-25
> 상태: 실행 중

## 목표
Alex/Lisa/Chris와 동일한 어드바이저 구조로,
개인 여행 계획을 전문적으로 도와주는 'Maya' 페르소나를 만든다.
`/consult` + 여행 키워드로 호출 가능하게 연동한다.

## 현재 상황
- 어드바이저 3명 운영 중 (Alex, Lisa, Chris)
- 각자 `agent/advisors/*.md` 파일로 관리
- `/consult` 메타 스킬이 키워드 감지 → 자동 라우팅
- 여행 관련 어드바이저는 없음

## 범위
### 포함
- `agent/advisors/travel_advisor.md` 신규 생성 (Maya 페르소나)
- CLAUDE.md 어드바이저 팀 테이블에 Maya 추가
- my-consult 스킬에 여행 키워드 라우팅 추가

### 미포함
- 별도 여행 스킬 파일 (추후 필요 시)
- 실제 항공/호텔 API 연동

## 단계별 작업
### 1단계: Maya 페르소나 파일 작성
- `agent/advisors/travel_advisor.md` 생성
- 역할, 전문 지식, 조언 원칙, Quick Reference 작성

### 2단계: CLAUDE.md 업데이트
- 어드바이저 팀 테이블에 Maya 추가
- 호출 방법 명시

### 3단계: my-consult 스킬 라우팅 추가
- 여행 관련 키워드 추가
- Maya로 라우팅 연결

## 예상 결과물
- `agent/advisors/travel_advisor.md`
- 업데이트된 `CLAUDE.md`
- 업데이트된 `.claude/skills/my-consult/SKILL.md`

## 리스크 & 주의사항
- 기존 어드바이저 패턴 유지해야 일관성 보장
