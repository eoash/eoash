# EO Studio - Multi-Agent System

이 디렉토리는 EO Studio의 멀티 에이전트 시스템을 관리합니다. 각 프로젝트별로 전담 에이전트가 있으며, 공유 컨텍스트를 참조합니다.

## 🎯 시스템 개요

**목적**: EO Studio의 재무, 법무, 운영 업무를 자동화하고 AI 에이전트가 자율적으로 관리
**원칙**: 시스템 우선, 자동화 우선, 명확한 책임, 데이터 기반 의사결정

## 📁 디렉토리 구조

```
agent/
├── projects/                    # 프로젝트별 에이전트
│   ├── ar_automation/          # AR 자동화 에이전트
│   │   ├── AGENT_README.md     # 에이전트 역할/책임
│   │   ├── context/            # 프로젝트별 컨텍스트
│   │   ├── memory/             # 운영 데이터
│   │   ├── tasks/              # 반복 작업 정의
│   │   └── reports/            # 리포트 아카이브
│   ├── finance/                # 재무/회계 에이전트
│   │   └── [동일 구조]
│   ├── legal/                  # 법무/계약 에이전트
│   │   └── [동일 구조]
│   └── operations/             # 운영 자동화 에이전트
│       └── [동일 구조]
├── shared/                     # 공유 컨텍스트
│   ├── identity.md            # Seohyun 프로필
│   ├── company.md             # EO Studio 정보
│   └── workflows.md           # 공통 워크플로우
└── README.md                  # 이 파일
```

## 🤖 에이전트 목록

### 1. AR Automation Agent
**역할**: 미수금 자동 추적 및 매칭
**상태**: ✅ 운영 중 (Phase 1 MVP)
**자세히**: `projects/ar_automation/AGENT_README.md`

**핵심 기능**:
- Bill.com ↔ Plaid 자동 매칭
- 일일/주간 AR 리포트
- 90+ days overdue 알림

### 2. Finance Agent
**역할**: 글로벌 재무 관리
**상태**: 📋 설계 완료, 구현 예정
**자세히**: `projects/finance/AGENT_README.md`

**핵심 기능**:
- 3개 지역 캐시플로우 모니터링
- FX 관리 및 알림
- 월간 재무 리포트

### 3. Legal Agent
**역할**: 법무/계약 관리
**상태**: 📋 설계 완료, 일부 구현 (이메일 모니터링)
**자세히**: `projects/legal/AGENT_README.md`

**핵심 기능**:
- 계약서 관리
- 주주명부 추적
- 변호사 이메일 모니터링

### 4. Operations Agent
**역할**: 운영 자동화
**상태**: 🔄 일부 운영 중 (Daily Journal, TODO)
**자세히**: `projects/operations/AGENT_README.md`

**핵심 기능**:
- 일일 TODO 발송
- 업무 일지 자동화
- ClickUp 태스크 관리

## 🚀 에이전트 사용 방법

### 방법 1: Claude Code 대화

특정 프로젝트에 대해 대화하고 싶을 때:

```bash
# AR Automation 관련
> "AR 상태 확인해줘"
> "오늘 미수금 리포트 실행해줘"

# Finance 관련
> "현재 캐시 포지션 알려줘"
> "환율 체크해줘"

# Legal 관련
> "변호사 이메일 확인해줘"
> "주주명부 최신 버전 보여줘"

# Operations 관련
> "오늘 TODO 보여줘"
> "주간 리포트 생성해줘"
```

**에이전트 자동 선택**: Claude Code는 대화 내용을 기반으로 적절한 에이전트 컨텍스트를 자동 로드합니다.

### 방법 2: 직접 스크립트 실행

```bash
# AR automation
python scripts/run_daily.py      # 일일 AR 체크
python scripts/run_weekly.py     # 주간 AR 리포트

# Operations
python scripts/daily_journal.py  # 일일 업무 일지
python scripts/send_daily_todo.py # 일일 TODO 발송
```

### 방법 3: 스케줄러 (자동 실행)

GitHub Actions 또는 Windows Task Scheduler를 통해 자동 실행:
- 일일 AR 체크: 매일 09:00 UTC
- 주간 리포트: 매주 월요일 09:00 UTC
- 일일 업무 일지: 매일 21:00 UTC

## 🔄 에이전트 간 협업

에이전트들은 다음과 같이 협업합니다:

### 데이터 공유
```
AR Agent → Finance Agent
- AR 매칭 완료 시 캐시플로우 업데이트

Legal Agent → Finance Agent
- 계약 만료 시 예산 영향 분석 요청

All Agents → Operations Agent
- 주간 리포트 통합
```

### 공유 저장소
- **Notion**: 중앙 데이터베이스
- **Slack**: 실시간 알림 및 커뮤니케이션
- **Git**: 메모리 파일 버전 관리

## 📊 에이전트 메모리 시스템

각 에이전트는 다음과 같은 메모리 구조를 가집니다:

### Context (정적 정보)
프로젝트별 고정 정보:
- 데이터 구조 정의
- 정책 및 가이드라인
- 워크플로우 설명

### Memory (동적 정보)
실시간 업데이트되는 운영 데이터:
- 현재 상태 (AR 현황, 캐시 포지션 등)
- 최근 결정 사항
- 진행 중인 이슈

### Reports (아카이브)
생성된 리포트 보관:
- 일일/주간/월간 리포트
- 히스토리 추적 가능

## 🔧 에이전트 설정 및 관리

### 새 에이전트 추가

1. 디렉토리 생성:
```bash
mkdir -p agent/projects/new_agent/{context,memory,tasks,reports}
```

2. AGENT_README.md 작성:
   - 역할 및 책임 정의
   - 워크플로우 설계
   - 도구 및 API 목록

3. 메모리 파일 초기화:
   - `memory/` 디렉토리에 필요한 .md 파일 생성

4. 이 README.md 업데이트:
   - 에이전트 목록에 추가

### 에이전트 상태 확인

```bash
# 각 에이전트의 최근 실행 로그 확인
ls -lt agent/projects/*/reports/daily/ | head -20

# 메모리 상태 확인
cat agent/projects/ar_automation/memory/financial_state.md
cat agent/projects/finance/memory/cash_state.md
```

### 에이전트 디버깅

```bash
# 로그 확인
tail -f logs/ar_automation.log
tail -f logs/operations.log

# Verbose 모드 실행
LOG_LEVEL=DEBUG python scripts/run_daily.py
```

## 🔐 보안 및 권한

### API 키 관리
- 모든 API key는 `.env` 파일 (git-ignored)
- Production/Development 환경 분리
- 정기 rotation (6개월)

### 에이전트 권한
각 에이전트는 필요한 시스템에만 접근:
- **Finance Agent**: Bill.com, Plaid, 은행 계좌
- **Legal Agent**: Google Drive, Gmail
- **Operations Agent**: Slack, ClickUp, Notion

자세한 권한 매트릭스: `shared/workflows.md#보안-및-권한`

## 📈 모니터링 및 알림

### 알림 채널
- 🔴 **긴급**: Slack DM
- 🟡 **중요**: Slack 채널 알림
- 🟢 **정보**: Notion 또는 일일 리포트

### 헬스 체크
```bash
# 시스템 상태 확인
python scripts/health_check.py

# 각 에이전트 상태
- AR Agent: 일일 리포트 확인
- Finance: 캐시 리포트 확인
- Legal: 변호사 이메일 모니터링 확인
- Operations: TODO 발송 확인
```

## 🛠️ 문제 해결

### 일반적인 문제

#### 에이전트가 응답하지 않음
```bash
# 로그 확인
tail -100 logs/[agent_name].log

# API 연결 테스트
python -c "from ash_bot.integrations import test_connections; test_connections()"
```

#### 리포트가 생성되지 않음
```bash
# 수동 실행
python scripts/run_daily.py

# 스케줄러 상태 확인 (Windows)
schtasks /query /TN "DailyJournal"
```

#### 데이터 동기화 실패
- Notion API 연결 확인
- Slack webhook URL 확인
- API rate limit 체크

자세한 에러 처리: `shared/workflows.md#에러-처리-워크플로우`

## 📚 참고 문서

### 공유 컨텍스트
- [`shared/identity.md`](shared/identity.md) - Seohyun 프로필 및 운영 철학
- [`shared/company.md`](shared/company.md) - EO Studio 회사 정보
- [`shared/workflows.md`](shared/workflows.md) - 공통 워크플로우 및 프로토콜

### 프로젝트별 문서
- [`projects/ar_automation/AGENT_README.md`](projects/ar_automation/AGENT_README.md)
- [`projects/finance/AGENT_README.md`](projects/finance/AGENT_README.md)
- [`projects/legal/AGENT_README.md`](projects/legal/AGENT_README.md)
- [`projects/operations/AGENT_README.md`](projects/operations/AGENT_README.md)

### 외부 문서
- **Bill.com API**: https://bill.com/api-docs
- **Plaid API**: https://plaid.com/docs
- **Slack API**: https://api.slack.com
- **Notion API**: https://developers.notion.com

## 🎯 로드맵

### Phase 1: 완료 ✅
- AR Automation 시스템 구축
- 멀티 에이전트 구조 설계
- 공유 컨텍스트 정의
- Operations 일부 자동화 (Daily Journal, TODO)

### Phase 2: 진행 중 🔄
- Finance Agent 구현 (캐시 모니터링, FX)
- Legal Agent 완성 (계약서 관리, 주주명부)
- Operations Agent 완성 (주간 리포트, Standup)

### Phase 3: 계획 📋
- 에이전트 간 자동 협업 강화
- 예측 및 추천 기능 (AI)
- 대시보드 자동 업데이트
- 모바일 알림 통합

## 📞 문의 및 지원

**담당자**: Seohyun Ahn (Finance & Operations Lead)
**프로젝트 시작**: 2026-02-09
**마지막 업데이트**: 2026-02-11

---

**버전**: 1.0
**라이선스**: Internal Use Only
