# AI Native Camp - Day 2 Notes

**날짜**: 2026-02-16
**작성자**: 안서현

---

## 📚 오늘의 주제

[교육 내용 들으면서 메모]

---

## 💡 주요 인사이트

### 폴더 구조 베스트 프랙티스 (Skills 기반)

다른 참가자들의 Claude Code 구조를 보니 `skills/` 폴더 아래에 컨텍스트를 구조화하는 것이 권장됨.

#### 권장 구조
```
project/
├── skills/                  # 프로젝트 스킬
│   ├── skill-name/          # 각 스킬별 디렉토리
│   │   ├── skill.md         # 스킬 정의
│   │   ├── context/         # 컨텍스트 파일들
│   │   ├── memory/          # 메모리/상태 파일
│   │   └── examples/        # 예시 코드/데이터
│   │
│   └── another-skill/
│       ├── skill.md
│       ├── context/
│       └── memory/
│
└── CLAUDE.md                # 프로젝트 전역 컨텍스트
```

#### 현재 우리 프로젝트 구조 (상세)
```
project/
├── agent/                          # 에이전트 컨텍스트 (현재)
│   ├── advisors/                   # 코드 리뷰어
│   │   ├── code_review_checklist.md
│   │   └── senior_architect.md
│   ├── context/                    # (비어있음)
│   ├── memory/                     # 메모리 파일
│   │   ├── camp_day2_notes.md     # 캠프 노트
│   │   ├── WORK_SUMMARY.md
│   │   ├── thumbnail_agent_guide.md
│   │   └── thumbnail_team_style_guide.md
│   ├── projects/                   # 프로젝트별 구조 ⭐
│   │   ├── ar_automation/         # AR 자동화
│   │   │   ├── context/
│   │   │   ├── memory/
│   │   │   ├── tasks/
│   │   │   └── reports/
│   │   ├── finance/               # 재무
│   │   ├── legal/                 # 법무
│   │   └── operations/            # 운영
│   ├── reports/                    # 리포트
│   │   ├── daily/
│   │   └── weekly/
│   ├── shared/                     # 공유 컨텍스트
│   │   ├── company.md
│   │   ├── identity.md
│   │   └── workflows.md
│   └── tasks/
│
├── ash_bot/                        # 메인 애플리케이션
│   ├── core/                       # 비즈니스 로직
│   ├── integrations/               # 외부 API
│   └── utils/                      # 유틸리티
│
├── scripts/                        # 실행 스크립트
├── tests/                          # 테스트
└── CLAUDE.md                       # 프로젝트 컨텍스트
```

**현재 구조 분석**:

✅ **잘 되어 있는 점**:
- 이미 `agent/projects/` 구조로 모듈화되어 있음
- 프로젝트별로 context, memory, tasks, reports 분리
- shared/ 폴더로 공통 컨텍스트 관리
- ash_bot/ 레이어 분리 (core, integrations, utils)

⚠️ **개선 가능한 점**:
- `agent/` 대신 `skills/` 네이밍이 더 직관적
- `agent/projects/ar_automation/` → 중첩이 깊음
- 빈 디렉토리 존재 (agent/context/, agent/tasks/)
- 각 스킬별 skill.md 정의 파일 없음

#### 왜 스킬 기반 구조가 좋은가?

1. **모듈화**: 각 스킬이 독립적으로 컨텍스트 관리
   - AR 자동화 스킬, 대시보드 스킬 등을 분리

2. **재사용성**: 스킬 폴더를 통째로 다른 프로젝트에 복사 가능
   - `skills/ar-automation/`을 다른 프로젝트에서도 사용

3. **명확한 범위**: Claude가 특정 스킬 실행 시 해당 폴더만 참조
   - 컨텍스트 오버로드 방지
   - 필요한 정보만 로드

4. **팀 협업**: 각자 맡은 스킬 폴더를 독립적으로 관리
   - `skills/john-invoice/`
   - `skills/sarah-dashboard/`

#### 고려사항
- 현재 `agent/` 구조를 `skills/` 기반으로 리팩토링 필요성 검토
- 기존 파일들을 어떻게 마이그레이션할지 계획

---

## 🔧 실습 내용

### 프로젝트 구조 개선안

#### 옵션 1: 최소 변경 (네이밍만)
```
agent/ → skills/
agent/projects/ar_automation/ → skills/ar_automation/
```
- 장점: 변경 최소화, 기존 구조 유지
- 단점: 여전히 중첩 깊음

#### 옵션 2: 구조 단순화 (권장) ⭐
```
skills/
├── ar-automation/              # 입금 매칭 자동화
│   ├── skill.md               # 스킬 정의 (새로 추가)
│   ├── context/
│   │   └── ar_structure.md
│   ├── memory/
│   │   ├── financial_state.md
│   │   └── decisions.md
│   └── examples/              # 예시 데이터
│
├── ai-native-camp/            # 캠프 학습
│   ├── skill.md
│   └── memory/
│       ├── camp_day1_notes.md
│       └── camp_day2_notes.md
│
├── finance-operations/        # 일반 재무 운영
│   ├── skill.md
│   ├── context/
│   └── memory/
│
└── shared/                    # 공유 컨텍스트
    ├── company.md
    ├── identity.md
    └── workflows.md
```

**변경 사항**:
1. `agent/projects/` → `skills/` (1단계 감소)
2. 각 스킬에 `skill.md` 추가 (스킬 정의)
3. `ar_automation` → `ar-automation` (케밥 케이스)
4. 캠프 노트를 별도 스킬로 분리

**장점**:
- 중첩 단순화 (3단계 → 2단계)
- 각 스킬의 목적이 명확
- 모듈 단위로 복사/이동 용이

---

## ❓ 질문 / 궁금한 점

-

---

## ✅ 액션 아이템

### 폴더 구조 리팩토링
- [ ] 옵션 1 vs 옵션 2 결정
- [ ] 백업 생성 (현재 agent/ 폴더)
- [ ] `agent/` → `skills/` 디렉토리명 변경
- [ ] 각 스킬별 `skill.md` 파일 작성
  - [ ] ar-automation/skill.md
  - [ ] ai-native-camp/skill.md
  - [ ] finance-operations/skill.md
- [ ] CLAUDE.md 업데이트 (새 폴더 구조 반영)
- [ ] 코드에서 경로 참조 수정 (있다면)
- [ ] Git commit & push

### 캠프 과제
- [ ] Day 2 학습 내용 정리
- [ ] 실습 결과 공유

---

## 📎 참고 자료

-

---

**다음 단계**:

