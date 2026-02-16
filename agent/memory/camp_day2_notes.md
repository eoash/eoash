# AI Native Camp - Day 2 Notes

**날짜**: 2026-02-16
**작성자**: 안서현

---

## 📚 오늘의 주제

### AI 스킬 활용 사례
- 카카오톡 읽기 스킬 존재
- 다양한 MCP/스킬로 확장 가능

### 미팅 문화 변화
- 과거: 미팅 많이 잡는 것이 목표
- 현재: 미팅을 빨리 끝내는 것이 목표
- 미국 트렌드: 1시간 → 45분 미팅으로 변화
- 이유: 효율성, 생산성 향상

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

### AI 스킬 생태계

#### 다양한 스킬 예시
- **카카오톡 읽기 스킬**: 카톡 메시지를 읽고 처리할 수 있음
- **구글 캘린더 스킬**: 일정 관리, 미팅 자동화
- **슬랙 스킬**: 메시지 읽기/쓰기, 채널 관리
- **이메일 스킬**: Gmail 등 이메일 자동화

→ MCP/스킬을 통해 거의 모든 서비스 연동 가능

---

### 미팅 효율성 (생산성 철학)

#### 미팅 문화의 변화
```
과거: 미팅 많이 잡기 = 바쁜 사람 = 중요한 사람
현재: 미팅 빨리 끝내기 = 효율적인 사람 = 생산적인 사람
```

#### 미국의 45분 미팅 트렌드
- **기존**: 1시간 (60분) 미팅
- **현재**: 45분 미팅
- **절약**: 15분 × 하루 4개 미팅 = 1시간 절약
- **효과**:
  - 집중력 향상 (파킨슨 법칙)
  - 다음 미팅까지 휴식/준비 시간 확보
  - 실제 업무 시간 증가

#### 우리 회사 적용 가능성
- 내부 미팅: 45분으로 설정
- 구글 캘린더 기본값 변경
- "이 미팅 꼭 필요한가?" 질문하기

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

## 🛠️ Context Sync 스킬 제작 (Day 2 메인 실습)

### 스킬 개요
- **이름**: my-context-sync
- **목적**: 여러 소스에서 정보를 자동 수집하여 하나의 문서로 정리
- **트리거**: "싱크", "sync", "정보 수집"
- **출력**: Markdown 파일 (sync/날짜-context-sync.md)

### Block 0: 도구 선택 + 스킬 생성
- 선택한 도구: Slack, Gmail, Google Calendar, Notion, GitHub (5개)
- 템플릿 기반으로 `.claude/skills/my-context-sync/SKILL.md` 생성
- 각 소스별 수집 방법 정의

### Block 1: 프로젝트 탐색
- **Explore 에이전트** 사용하여 프로젝트 구조 파악
- 발견 사항:
  - Windows 환경
  - credentials.json, token.json 존재 (Google API)
  - Slack API 토큰 설정됨
  - 멀티 에이전트 구조 (agent/ 디렉토리)
- 스킬을 프로젝트 환경에 맞게 조정 (PowerShell 기반)

### Block 2: 도구 연결
**3가지 연결 방법 학습:**
1. **Connectors** (가장 쉬움): 웹 브라우저에서 클릭으로 연결
2. **claude mcp add**: 명령어 한 줄로 MCP 서버 연결
3. **API 스크립트**: Claude가 코드 작성

**실제 연결:**
- Slack, Notion: Connectors로 연결
- GitHub: Plugin 설치됨
- Gmail, Calendar: API 스크립트 작성
  - `gmail_fetch.py`: Gmail API로 이메일 수집
  - `calendar_fetch.py`: Google Calendar API로 일정 수집

### Block 3: 병렬 수집 & 검증
**병렬 수집 개념:**
- 카페 직원 비유: 여러 직원이 동시에 일하면 3배 빠름
- Subagent로 각 소스를 독립적으로 동시 수집
- 순차 90초 → 병렬 30초

**수집 실패 원인 (4가지):**
1. 인증/API 키 문제 (가장 흔함)
2. 네트워크 문제
3. 권한 문제
4. 도구 설정 문제

### Block 4: Output 설정
**3가지 출력 옵션:**
1. Markdown 파일 (기본, 가장 간단)
2. Slack 메시지 (팀 공유)
3. Notion 페이지 (기록 축적)

**선택**: Markdown 파일만 (sync/YYYY-MM-DD-context-sync.md)

### Block 5: 최종 완성 + 실행
✅ 스킬 구성 최종 확인
✅ 트리거 설정: "싱크해줘" 한마디로 실행
✅ 5개 소스 연결 완료
✅ 병렬 수집 구조 설계 완료

**활용 팁:**
- 매일 아침 "싱크해줘"로 모닝 브리핑
- CLAUDE.md에 스케줄 추가하면 자동 실행 가능
- 소스 추가/제거 자유롭게 가능

---

## 💡 Day 2 핵심 학습

### 3대 핵심 개념
1. **MCP 연결**: Claude와 외부 도구를 연결하는 표준 통로
2. **Subagent 병렬 수집**: 여러 작업을 동시에 처리
3. **스킬 구축**: 나만의 자동화 레시피 제작

### 기술적 성과
- Explore 에이전트 활용 (읽기 전용 프로젝트 탐색)
- Google API 스크립트 작성 (gmail_fetch.py, calendar_fetch.py)
- Windows PowerShell 환경 대응
- 멀티 에이전트 구조 이해

---

## 📎 참고 자료

- MCP 공식 문서: https://modelcontextprotocol.io/
- Claude Code MCP: https://code.claude.com/en/docs/claude-code/mcp
- Subagent 문서: https://docs.claude.com/en/docs/claude-code/sub-agents

---

**다음 단계**: Day 3 - Context Sync 스킬 개선 및 고도화

