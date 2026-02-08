# EO Studio AR Automation System

자동화된 미수금(AR) 추적 시스템으로 Bill.com + Chase Bank 통합을 통해 매일 자동으로 invoice 상태를 업데이트하고 리포트를 생성합니다.

## 개요

**문제**: US region AR tracking이 완전히 수동으로 진행 중
- Bill.com에서 매일 인터넷뱅킹 접속하여 입금 확인
- 수동으로 Bill.com status 업데이트
- 시간 소모 + human error 위험

**솔루션**: 자동화 시스템
- ✅ Bill.com API로 outstanding invoices 자동 조회
- ✅ Plaid로 Chase Bank 거래 자동 조회
- ✅ 지능형 matching으로 payment ↔ invoice 연결
- ✅ Bill.com status 자동 업데이트
- ✅ 일일/주간 리포트 → Slack + Notion
- ✅ 결과 30분/일 → 5분/일로 단축

## 아키텍처

```
Daily Scheduler (9:00 UTC)
        ↓
┌─────────────────────────┐
│  ash_bot (Python)       │
├─────────────────────────┤
│ 1. Fetch Bill.com      │
│ 2. Fetch Chase (Plaid) │
│ 3. Match payments      │
│ 4. Update Bill.com     │
│ 5. Generate report     │
│ 6. Send notifications  │
└─────────────────────────┘
        ↓↓↓
    Slack + Notion
```

## 시작하기

### 1. 환경 설정

```bash
# Python 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt
```

### 2. API 자격증명 설정

`.env` 파일 생성 (`.env.example` 참조):

```bash
# Bill.com API
BILL_COM_API_KEY=your_key_here
BILL_COM_ORG_ID=your_org_id_here

# Plaid API (Chase Bank)
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_secret_here
PLAID_ENV=sandbox
PLAID_ACCESS_TOKEN=your_access_token_here

# Slack
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_CHANNEL_DAILY=finance-ar-daily

# Notion
NOTION_TOKEN=ntn_your_token_here
NOTION_AR_DATABASE_ID=your_database_id
```

### 3. 첫 번째 테스트 실행 (Dry-run mode)

```bash
# Dry-run: Bill.com에 실제로 업데이트하지 않음
python scripts/run_daily.py
```

출력:
- 매칭된 payment 개수
- 업데이트될 invoice 목록
- 생성된 리포트

### 4. 실제 운영 시작

```bash
# 자동 업데이트 활성화
BILL_COM_UPDATE_ENABLED=true python scripts/run_daily.py
```

## 프로젝트 구조

```
ash_bot/
├── integrations/       # 외부 API 클라이언트
│   ├── bill_com.py     # Bill.com API
│   ├── plaid_client.py # Plaid (Chase Bank)
│   ├── slack_client.py
│   └── notion_client.py
├── core/              # 비즈니스 로직
│   ├── matcher.py     # Payment-Invoice matching
│   ├── ar_reporter.py # Report generation
│   └── updater.py     # Bill.com status update
├── utils/
│   ├── logger.py
│   └── validators.py
├── config.py          # Configuration management
└── main.py            # Orchestration

agent/
├── context/           # 프로젝트 컨텍스트
│   └── ar_structure.md
└── memory/            # 운영 데이터
    ├── financial_state.md
    ├── decisions.md
    └── last_run.json
```

## 사용 방법

### 일일 자동화 실행

```bash
python scripts/run_daily.py
```

**출력**:
- ✅ 새로 결제된 invoice 목록
- ⏳ 현재 outstanding AR (aging별)
- 🔔 액션 항목 (90+ days overdue)

### 주간 리포트 생성

```bash
python scripts/run_weekly.py
```

**출력**:
- 💰 주간 수금액
- 📈 주간 대비 변화
- 🚨 Top overdue invoices

### 테스트 및 검증

```bash
# Unit tests
pytest tests/

# 특정 테스트만
pytest tests/test_matcher.py -v
```

## Matching 로직

### 매칭 규칙 (우선순위)

1. **Exact Match** (신뢰도 100%)
   - Amount 정확히 일치 (±$0.01)
   - Payment date ≥ Invoice date

2. **Number Extraction** (신뢰도 95%)
   - Payment description에서 invoice # 추출 (INV-123)
   - Amount 큰 차이 허용 (±$1.00)

3. **Fuzzy Name Match** (신뢰도 50-80%)
   - Customer name 유사도 > 70%
   - 마지막 수단

### 매칭 불가능한 경우

- 같은 금액의 invoice가 여러 개
- Payment amount와 맞는 invoice 없음
- Customer name이 전혀 일치 안 함
- Payment date가 invoice date보다 이전

→ 수동 검토를 위해 리포트에 포함

## 에러 처리

### API 오류
- Rate limiting: Exponential backoff
- Timeout: 30초 후 재시도
- 실패 시: Slack alert 발송

### 매칭 오류
- 낮은 신뢰도: 리포트에만 포함
- Duplicate matches: 가장 높은 신뢰도 선택
- 매칭 실패: 수동 검토 큐

### 업데이트 오류
- Dry-run 모드에서 검증
- 실패 시 Notion에 기록
- Audit trail 유지

## 모니터링

### 일일 체크리스트

- [ ] Daily report가 Slack에 도착했는가?
- [ ] Matching rate가 90% 이상인가?
- [ ] Failed updates가 없는가?
- [ ] 90+ days overdue invoice가 있는가?

### 주간 검토

- [ ] Weekly report 검토
- [ ] Matching 정확도 확인
- [ ] Overdue invoices follow-up
- [ ] Financial state 업데이트

### 월간 리뷰

- `agent/memory/financial_state.md` 업데이트
- Matching 규칙 검토
- Policy 변경 필요 여부 확인

## 설정 및 커스터마이제이션

### Matching 설정

`ash_bot/config.py`:
```python
class ARConfig:
    AMOUNT_TOLERANCE = 0.01  # Exact match tolerance
    TRANSACTION_LOOKBACK_DAYS = 7  # 조회 기간
    AGING_BUCKETS = {
        "current": (0, 30),
        "31_60": (31, 60),
        "61_90": (61, 90),
        "90_plus": (91, float('inf'))
    }
```

### 리포트 스케줄

GitHub Actions (`.github/workflows/daily-ar-check.yml`):
```yaml
schedule:
  - cron: '0 9 * * *'  # 매일 9:00 UTC
```

또는 로컬 cron:
```bash
0 9 * * * cd /path && ./venv/bin/python scripts/run_daily.py
0 9 * * MON cd /path && ./venv/bin/python scripts/run_weekly.py
```

## 성공 메트릭

- ✅ 90%+ automatic matching rate
- ✅ 99%+ workflow success rate
- ✅ <10분 리포트 생성 시간
- ✅ 월간 미수금 추적 정확도 향상

## 다음 단계 (Phase 2+)

### 단기 (1개월)
- [ ] Hanmi Bank integration
- [ ] Manual override mechanism
- [ ] Duplicate payment detection

### 중기 (3개월)
- [ ] Korea region expansion
- [ ] Vietnam region expansion
- [ ] Auto-generated follow-up emails

### 장기 (6개월+)
- [ ] ML-based matching
- [ ] Early payment incentive calc
- [ ] Revenue forecasting
- [ ] Cash flow projection

## 문제 해결

### Bill.com API 연결 불가
1. API key/org ID 확인
2. Bill.com 계정 권한 확인
3. Network/firewall 확인

### Plaid 거래 조회 실패
1. Access token 유효성 확인
2. Chase 계정이 연결되어 있는지 확인
3. Plaid 환경 설정 확인 (sandbox vs production)

### 매칭 정확도 낮음
1. `agent/memory/decisions.md`의 matching 규칙 검토
2. Payment description 분석 (invoice # 포함 여부)
3. Customer name 매칭 로직 개선

### Slack/Notion 메시지 미수신
1. Bot token/API token 유효성 확인
2. Channel/database 권한 확인
3. Network 연결 확인

## 기여 및 피드백

- 버그 리포트: `/agent/memory/decisions.md` 업데이트
- 성능 개선: `ash_bot/core/matcher.py` 최적화
- 새로운 기능: Phase 2 계획 참조

## 라이선스

EO Studio 내부 프로젝트

---

**시작 날짜**: 2026-02-09
**담당**: Finance + Operations
**Support**: Seohyun Ahn (Finance Lead)
