# 맥락 노트: 여행 어드바이저 에이전트

> 생성일: 2026-02-25

## 현재 상황 분석
- 어드바이저 파일 구조: `agent/advisors/[name].md`
- 공통 섹션: Role / 전담 컨텍스트 / 전문 지식 체계 / 조언 원칙 / Quick Reference / Skill 연동
- Alex = senior_architect.md / Lisa = legal_advisor.md / Chris = finance_advisor.md
- my-consult 스킬: `C:/Users/ash/ash/.claude/skills/my-consult/SKILL.md`

## 관련 파일 & 자료
| 파일/자료 | 위치 | 역할 |
|-----------|------|------|
| travel_advisor.md | `agent/advisors/travel_advisor.md` | Maya 페르소나 (신규) |
| senior_architect.md | `agent/advisors/senior_architect.md` | 패턴 참고 |
| my-consult SKILL.md | `.claude/skills/my-consult/SKILL.md` | 라우팅 추가 대상 |
| CLAUDE.md | `CLAUDE.md` | 어드바이저 팀 테이블 업데이트 |

## 결정 사항
| 결정 | 이유 | 기각한 대안 |
|------|------|-------------|
| 어드바이저 이름 'Maya' | 세계적이고 친근한 느낌, 사용자 승인 | Jay, Sam, Kai |
| 스킬 파일은 만들지 않음 | /consult 연동으로 충분 | 별도 /travel 스킬 |
| 올라운더 스타일 | 사용자 요청 | 지역 전문화 |

## Maya 페르소나 핵심 방향
- 15년 경력의 여행사 베테랑 (올라운더)
- 개인 맞춤형 일정 설계 특기
- 버짓 최적화, 현지 팁, 비수기/성수기 전략
- 한국인 여행자 특성 이해 (비자, 환전, 항공사 등)
