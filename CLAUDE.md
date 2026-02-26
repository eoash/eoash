# CLAUDE.md — EO Studio Operations OS

---

## 0. 운영 규칙

**절대 자동 실행 금지**
- `my-context-sync` 스킬: 사용자가 "싱크" / "sync" 명시 요청 시에만
- 대외 이메일 발송 (`flip_send.py` 등): 반드시 확인 후
- Production 전환 (`BILL_COM_UPDATE_ENABLED=true` 등): 반드시 확인 후
- 법률 문서 수정 (계약서, 주주 서류): 반드시 확인 후
- 데이터베이스 스키마 변경 / 대량 데이터 삭제: 반드시 확인 후

**항상 해야 하는 것**
- 결과물(코드/솔루션)을 설명보다 먼저 제시
- 옵션 나열 시 추천 하나를 명시
- 완료 후 "다음 단계" 제시
- 모호하면 추측하지 말고 물어볼 것
- 한국어로 대화, 코드·파일명은 영어

---

## 1. 사용자 프로필

**안서현 (Seohyun Ahn)** — Finance & Operations Lead, EO Studio
- 책임: 한국/미국/베트남 3개 법인 재무·운영·법무·인사 총괄
- 도구: Notion, Slack, ClickUp, Bill.com (US), Google Sheets, Gmail, GitHub
- 스타일: 70% 완성도로 먼저 작동 → 개선. 수작업보다 시스템. 빠른 실행.
- 비개발자지만 API 연동·코드 리뷰·멀티에이전트 설계 직접 수행

상세 프로필: `agent/shared/identity.md` | 회사 정보: `agent/shared/company.md` | 워크플로우: `agent/shared/workflows.md`

---

## 2. 응답 프로토콜

- 코드/솔루션을 설명보다 먼저 제시
- 에러 발견 시 "이렇게 고치면 됩니다" 형태로 (문제 지적만 X)
- 여러 옵션 제시 시 추천 하나를 명시
- 기술 설명은 비개발자 수준으로 (원리보다 사용법)
- 작업 완료 후 "다음은 이걸 하면 됩니다" 제시

---

## 3. 시스템 맵

### 어드바이저 (판단·분석)
```
agent/advisors/senior_architect.md   → Alex  (코드/아키텍처/리팩터링)
agent/advisors/legal_advisor.md      → Lisa  (법률/계약/주주/외국환)
agent/advisors/finance_advisor.md    → Chris (재무/AR/FX/캐시플로우)
```
자동 라우팅: `/consult` → 키워드 감지 → Alex/Lisa/Chris 자동 분기

### 스킬 (`.claude/skills/`)
```
my-context-sync       → 6개 소스 컨텍스트 통합 (수동 요청 시에만)
my-session-wrap       → 세션 마무리 정리
my-consult            → 어드바이저 자동 라우팅 (/consult)
my-code-reviewer      → 코드 리뷰 (/review)
my-legal-advisor      → 법률 상담 (/legal)
my-finance-advisor    → 재무 상담 (/finance)
my-plan-first         → 작업 전 3문서 수립 (/plan)
my-fetch-tweet        → X/Twitter 요약·번역
my-fetch-youtube      → YouTube 자막 추출·요약
my-content-digest     → Quiz-First 콘텐츠 학습
my-townhall-agency    → 타운홀 슬라이드 4-Agent 자동 생성 (/townhall)
```

### 자동화 스크립트 (`scripts/`)
```
scripts/daily/           → 일일 자동화 (AR 체크, TODO, 저널)
scripts/flip_send.py     → Flip 투자자 이메일 발송 (17명)
scripts/flip_send_packets.py → 서명 패킷 발송
scripts/generate_*.py   → Flip 문서 자동 생성 (체크리스트, 이사회의사록)
scripts/read_cash_*.py  → 캐시플로우 데이터 조회
scripts/read_sheets*.py → Google Sheets 데이터 조회
```

### 프로젝트별 메모리 (`agent/projects/`)
```
ar_automation/    → AR 매칭 자동화 (Bill.com + Plaid), 결정 로그 포함
finance/          → 재무 대시보드, FX
legal/            → 법무 문서 (Flip 등)
operations/       → 운영 자동화, 온보딩
```

### 주요 서브 프로젝트
```
onboarding/       → Slack Bolt 온보딩 챗봇 (missions.yaml 기반)
dashboard/        → Streamlit 재무 대시보드 (별도 git repo: eoash/eo-finance-dashboard)
ash_bot/          → 핵심 자동화 로직 (Bill.com, Plaid, Slack, Notion 연동)
townhall/         → 타운홀 슬라이드 산출물 (DATA.md, OUTLINE.md, slides.gs)
```

---

## 4. 어드바이저 팀

| 어드바이저 | 전문 영역 | 호출 방법 |
|-----------|---------|---------|
| Alex | 코드, 아키텍처, SOLID, 리팩터링 | `/review`, `/consult` + 코드 키워드 |
| Lisa | 법률, 계약, 외국환, 주주, 컴플라이언스 | `/legal`, `/consult` + 법률 키워드 |
| Chris | 재무, AR, FX, 캐시플로우, 세무 | `/finance`, `/consult` + 재무 키워드 |

판단 불가 시: "어느 어드바이저에게 물어볼까요?" 질문 출력

---

## 5. 현재 진행 상태

**당면 과제**
- [ ] AR 매칭 자동화 Production 전환 (dry-run 완료, Bill.com update 활성화 필요)
- [ ] Flip 투자자 이메일 최종 발송 (정호석 변호사 검토 + 수신자 이메일 확정 대기)
- [ ] 재무 대시보드 고도화 (`dashboard/` — Streamlit, Google Sheets 연동)

**최근 완성된 시스템**
- 타운홀 슬라이드 에이전시 (`my-townhall-agency`) — 4-Agent 파이프라인, EO Town Hall 덱에 3장 자동 삽입
- Slack 온보딩 챗봇 (`onboarding/`) — missions.yaml 기반, daily reminder 포함
- Flip 발송 시스템 — `flip_send.py` + 17명 체크리스트 + 이사회의사록 자동 생성
- 어드바이저 팀 — Alex/Lisa/Chris + `/consult` 자동 라우팅
- claude-quest Windows 버그 수정 — `encodeProjectPath` 함수 개선 (`\`, `:` → `-` 변환)

**알려진 블로커**
- Flip: 정호석 변호사 검토 완료 전까지 발송 보류
- AR Production: `BILL_COM_UPDATE_ENABLED=true` 전환 전 Dry-run 재검증 필요

**작업 히스토리 상세**: `agent/memory/WORK_SUMMARY.md`
**AR 결정 로그**: `agent/projects/ar_automation/memory/decision_log.md`
**재무 상태**: `agent/projects/ar_automation/memory/financial_state.md`

---

*마지막 업데이트: 2026-02-26*
