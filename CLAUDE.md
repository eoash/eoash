# CLAUDE.md

가이드 라인: Claude Code와 함께 이 저장소에서 작업할 때 참고하는 파일입니다.

## 프로젝트 정보

**프로젝트명**: EO Studio AR Automation System
**목표**: US region 미수금(AR) 추적 자동화
**기술**: Python, Bill.com API, Plaid, Slack, Notion
**상태**: Phase 1 MVP 구현 완료 (2026-02-09)

## 프로젝트 구조

```
ash_bot/               # 메인 애플리케이션
├── integrations/      # 외부 API 클라이언트
├── core/             # 비즈니스 로직 (Matcher, Reporter, Updater)
├── utils/            # 유틸리티 함수
├── config.py         # 설정 관리
└── main.py           # 메인 오케스트레이션

agent/                # 프로젝트 메모리 및 컨텍스트
├── advisors/         # 코드 리뷰 및 아키텍처 가이드
│   ├── senior_architect.md      # 시니어 아키텍트 (Alex Kim)
│   └── code_review_checklist.md # 코드 리뷰 체크리스트
├── context/          # ar_structure.md (AR 데이터 구조)
├── memory/           # 운영 데이터 (financial_state, decisions)
├── tasks/            # 반복 작업 정의
└── reports/          # 일일/주간 리포트 아카이브

scripts/              # 실행 스크립트
├── run_daily.py      # 일일 AR 자동화
└── run_weekly.py     # 주간 리포트

tests/                # 단위 테스트
```

## 빌드 및 테스트 명령어

```bash
# 환경 설정
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 테스트 실행
pytest tests/ -v

# 일일 실행 (Dry-run)
python scripts/run_daily.py

# 주간 리포트
python scripts/run_weekly.py
```

## 개발 워크플로우

### 코드 작성 프로세스 (MANDATORY)

**모든 코드는 Alex Kim (시니어 아키텍트) 리뷰를 거쳐야 합니다.**

1. **설계 단계**
   - 요구사항 분석
   - 클린 아키텍처 원칙 확인 (`agent/advisors/senior_architect.md`)
   - 레이어 분리 설계 (Domain → Application → Infrastructure)
   - Alex에게 설계 리뷰 요청: "이 설계가 클린 아키텍처를 따르나요?"

2. **코드 작성**
   - Type hints 필수
   - Dependency injection 사용
   - SOLID 원칙 준수
   - 작은 함수 (<20 lines)
   - 의미있는 변수/함수명

3. **Self-Review (코드 작성 후)**
   - `agent/advisors/code_review_checklist.md` 체크리스트 확인
   - 모든 항목 통과 확인
   - 스스로 물어보기:
     - "이 코드를 테스트할 수 있나?"
     - "한 문장으로 설명 가능한가?"
     - "의존성을 교체할 수 있나?"

4. **Alex Review (커밋 전 필수)**
   - Alex에게 코드 리뷰 요청
   - SOLID 위반 여부 확인
   - 리팩토링 제안 반영
   - 아키텍처 개선점 적용

5. **테스트**
   - Unit tests 작성
   - Integration tests (필요시)
   - 모든 테스트 통과 확인

6. **커밋**
   - 명확한 커밋 메시지
   - 원자적 커밋 (one logical change)
   - `.env` 파일 제외 확인

### 운영 워크플로우

### 1. 환경 변수 설정
- `.env.example` 복사하여 `.env` 생성
- 모든 API credentials 입력

### 2. 테스트 모드에서 시작
- `dry_run=True`로 설정
- Bill.com 실제 업데이트 없음
- 로그와 리포트만 생성

### 3. 검증
- Matching 정확도 확인 (target: 90%+)
- 리포트 형식 검증
- Slack/Notion 알림 테스트

### 4. 운영 전환
- `.env` BILL_COM_UPDATE_ENABLED=true 설정
- Scheduler 설정 (GitHub Actions 또는 cron)
- Slack/Notion 채널 모니터링 시작

## 클린 아키텍처 가이드라인

### 아키텍처 원칙

**의존성 규칙**: 외부 레이어 → 내부 레이어 (역방향 불가)

```
┌─────────────────────────────────────┐
│  Presentation (Scripts/CLI)         │  ← 사용자 인터페이스
├─────────────────────────────────────┤
│  Application (Use Cases)            │  ← 비즈니스 로직 오케스트레이션
├─────────────────────────────────────┤
│  Domain (Business Logic)            │  ← 핵심 비즈니스 규칙
├─────────────────────────────────────┤
│  Infrastructure (API Clients)       │  ← 외부 연동
└─────────────────────────────────────┘
```

### SOLID 원칙

- **S** - Single Responsibility: 한 클래스는 하나의 책임만
- **O** - Open/Closed: 확장에는 열려있고 수정에는 닫혀있게
- **L** - Liskov Substitution: 파생 클래스는 기반 클래스를 대체 가능해야
- **I** - Interface Segregation: 클라이언트별 인터페이스 분리
- **D** - Dependency Inversion: 추상화에 의존, 구체화에 의존 X

### 필수 규칙

1. **Dependency Injection**: 모든 외부 의존성은 생성자로 주입
2. **Type Hints**: 모든 함수 시그니처에 타입 힌트
3. **No Hard-coded Values**: 설정은 `.env` 또는 config 파일
4. **Small Functions**: 함수는 20줄 이하 권장
5. **Testing**: 핵심 로직은 반드시 테스트 작성

### Code Review 프로세스

**커밋 전 필수 확인사항**:
- [ ] `agent/advisors/code_review_checklist.md` 전체 확인
- [ ] Alex Kim (시니어 아키텍트)에게 리뷰 요청
- [ ] SOLID 원칙 위반 없음
- [ ] 모든 테스트 통과
- [ ] Type hints 완료

**참고 문서**:
- `agent/advisors/senior_architect.md` - 클린 아키텍처 가이드
- `agent/advisors/code_review_checklist.md` - 리뷰 체크리스트

---

## 핵심 로직 위치

### Matching Logic
`ash_bot/core/matcher.py:PaymentMatcher`
- 3단계 매칭 (Exact → Number Extraction → Fuzzy)
- Confidence score 계산
- Multiple candidates 처리

### Report Generation
`ash_bot/core/ar_reporter.py:ARReporter`
- Daily/Weekly report 생성
- Aging analysis
- Top overdue invoices 추출

### Bill.com Updates
`ash_bot/core/updater.py:InvoiceUpdater`
- Status update 처리
- Dry-run mode 지원
- Audit trail 로깅

## 설정 및 커스터마이제이션

### AR Matching 설정
`ash_bot/config.py:ARConfig`
```python
AMOUNT_TOLERANCE = 0.01      # Exact match tolerance
TRANSACTION_LOOKBACK_DAYS = 7  # 조회 기간
AGING_BUCKETS = {...}        # 미수금 구간
```

### API 설정
각 서비스별 config class:
- `BillComConfig`
- `PlaidConfig`
- `SlackConfig`
- `NotionConfig`

## 메모리 및 컨텍스트

### 프로젝트 메모리 파일
- `agent/context/ar_structure.md`: AR 데이터 구조 정의
- `agent/memory/financial_state.md`: 현재 재무 상태
- `agent/memory/decisions.md`: 주요 정책 및 결정

### 운영 데이터
- `agent/memory/last_run.json`: 최근 실행 결과
- `agent/reports/daily/`: 일일 리포트 아카이브
- `agent/reports/weekly/`: 주간 리포트 아카이브

## 주요 고려사항

### 보안
- ✅ 모든 credentials는 `.env` 파일 (git-ignored)
- ✅ API keys는 절대 로그에 출력 안 함
- ✅ Sensitive data는 암호화

### 성능
- Rate limiting 고려 (Bill.com 1회/초)
- Plaid timeout 30초
- Local caching (선택사항)

### 안정성
- Graceful degradation (부분 실패 허용)
- Comprehensive error handling
- Slack/Notion alert on failure
- Audit trail 유지

## 테스트 전략

### Unit Tests
`tests/test_matcher.py`
- Exact amount match
- Invoice number extraction
- Fuzzy name matching
- Edge cases (multiple invoices, no match)

### Integration Tests
- Bill.com API connectivity
- Plaid transaction fetch
- Slack message posting
- Notion page creation

### Manual Testing Checklist
- [ ] Dry-run 모드에서 매칭 확인
- [ ] Slack 메시지 포맷 검증
- [ ] Notion 페이지 생성 확인
- [ ] 90+ days overdue alert 테스트

## 배포 및 스케줄링

### GitHub Actions (권장)
`.github/workflows/daily-ar-check.yml`
```yaml
schedule:
  - cron: '0 9 * * *'  # 매일 9:00 UTC
```

### Local Cron
```bash
0 9 * * * /path/to/venv/bin/python /path/to/scripts/run_daily.py
0 9 * * MON /path/to/venv/bin/python /path/to/scripts/run_weekly.py
```

## 모니터링 및 유지보수

### 일일 체크
- Slack에 리포트 도착
- Matching rate 확인
- Failed updates 확인

### 주간 리뷰
- Financial state 업데이트
- Overdue invoices follow-up
- Policy 변경 필요 여부

### 월간 리뷰
- `agent/memory/financial_state.md` 업데이트
- Matching 규칙 성능 검토
- Phase 2 계획 진행

## 문제 해결

### 로그 위치
`logs/` 디렉토리:
- `ar_automation.log`: 메인 로그
- `bill_com.log`: Bill.com API 로그
- `plaid_client.log`: Plaid API 로그

### 디버깅
```bash
# Verbose 로깅
LOG_LEVEL=DEBUG python scripts/run_daily.py

# 특정 모듈만
python -c "from ash_bot.core import PaymentMatcher; ..."
```

## 다음 단계

### Phase 2 계획
- [ ] Hanmi Bank integration
- [ ] Manual override mechanism
- [ ] Duplicate payment detection

### 성능 최적화
- [ ] Caching layer 추가
- [ ] Batch processing
- [ ] Async API calls

## 유용한 링크 및 참고자료

- **Bill.com API Docs**: https://bill.com/api-docs
- **Plaid API Docs**: https://plaid.com/docs
- **Slack API Docs**: https://api.slack.com
- **Notion API Docs**: https://developers.notion.com
- **프로젝트 메모리**: `agent/memory/`

---

**프로젝트 시작**: 2026-02-09
**담당자**: Seohyun Ahn (Finance Lead)
**시니어 아키텍트**: Alex Kim (Code Review & Architecture)
**마지막 업데이트**: 2026-02-11
