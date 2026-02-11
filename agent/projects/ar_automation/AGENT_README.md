# AR Automation Agent

## 역할 (Role)

**미수금(AR) 자동화 에이전트** - US region 미수금 추적, 매칭, 리포팅을 자동화하는 전담 에이전트

## 책임 범위 (Responsibilities)

### 1. 자동 미수금 매칭
- Bill.com 미결제 인보이스 조회
- Plaid를 통한 은행 거래 내역 조회
- 3단계 매칭 로직 (Exact → Number Extraction → Fuzzy)
- Confidence score 계산 및 매칭 결과 검증

### 2. 리포팅
- **일일 리포트**: 매칭 결과, 미매칭 항목, aging analysis
- **주간 리포트**: 주간 수금 현황, Top overdue invoices, 트렌드 분석
- Slack 및 Notion으로 자동 발송

### 3. 상태 업데이트
- Bill.com 인보이스 상태 자동 업데이트
- Payment received date 기록
- Audit trail 로깅

### 4. 모니터링 및 알림
- 90+ days overdue 항목 즉시 알림
- 미매칭 항목 검토 요청
- API 에러 및 시스템 장애 알림

## 사용하는 도구 (Tools)

### API 통합
- **Bill.com API**: 인보이스 조회 및 업데이트
- **Plaid API**: Mercury 은행 거래 내역 조회
- **Slack API**: 리포트 발송 및 알림
- **Notion API**: 대시보드 업데이트

### 핵심 컴포넌트
- `ash_bot/core/matcher.py`: PaymentMatcher (매칭 로직)
- `ash_bot/core/ar_reporter.py`: ARReporter (리포트 생성)
- `ash_bot/core/updater.py`: InvoiceUpdater (상태 업데이트)
- `ash_bot/integrations/`: 각종 API 클라이언트

## 워크플로우 (Workflows)

### 일일 자동화 (Daily Automation)
```
1. Bill.com에서 unpaid invoices 조회
2. Plaid에서 최근 7일 거래 내역 조회
3. PaymentMatcher로 자동 매칭 수행
4. 매칭 결과 검증 (confidence threshold)
5. 높은 confidence 매칭은 Bill.com 자동 업데이트
6. 낮은 confidence는 수동 검토 요청
7. 일일 리포트 생성 및 Slack 발송
8. 결과 아카이브 (agent/projects/ar_automation/reports/daily/)
```

### 주간 리포트 (Weekly Report)
```
1. 지난 7일 데이터 집계
2. Aging analysis (0-30, 31-60, 61-90, 90+ days)
3. Top 10 overdue invoices 추출
4. 주간 수금 금액 및 미수금 변화 계산
5. 주간 리포트 생성 및 Notion 업데이트
6. Executive summary Slack 발송
```

### 수동 개입 시나리오
- Confidence < 80%인 매칭은 Slack으로 검토 요청
- 90+ days overdue는 즉시 알림 + 수동 follow-up
- 중복 매칭 발생 시 수동 선택 요청

## 설정 및 파라미터

### Matching Configuration
- `AMOUNT_TOLERANCE`: 0.01 (금액 허용 오차)
- `TRANSACTION_LOOKBACK_DAYS`: 7 (조회 기간)
- `CONFIDENCE_THRESHOLD_AUTO_UPDATE`: 80 (자동 업데이트 임계값)
- `FUZZY_MATCH_THRESHOLD`: 85 (Fuzzy match 점수)

### Aging Buckets
```python
{
    "0-30 days": (0, 30),
    "31-60 days": (31, 60),
    "61-90 days": (61, 90),
    "90+ days": (91, float('inf'))
}
```

### API Rate Limits
- Bill.com: 1 request/second
- Plaid: 100 requests/minute
- Slack: 1 message/second

## 메모리 및 컨텍스트 (Memory & Context)

### Context Files
- `context/ar_structure.md`: AR 데이터 구조 및 필드 정의

### Memory Files
- `memory/financial_state.md`: 현재 미수금 현황
- `memory/decisions.md`: 정책 변경 및 중요 결정 사항
- `memory/last_run.json`: 최근 실행 결과 (자동 생성)

### Reports Archive
- `reports/daily/YYYY-MM-DD_daily_report.md`
- `reports/weekly/YYYY-MM-DD_weekly_report.md`

## 스케줄링 (Scheduling)

### 일일 실행
- **시간**: 매일 오전 9:00 UTC (한국 시간 18:00)
- **명령**: `python scripts/run_daily.py`
- **방법**: GitHub Actions 또는 cron

### 주간 실행
- **시간**: 매주 월요일 오전 9:00 UTC
- **명령**: `python scripts/run_weekly.py`
- **방법**: GitHub Actions 또는 cron

## 에이전트 호출 방법 (How to Invoke)

### Claude Code에서
```bash
# AR 에이전트와 대화 시작
> "AR automation 상태 확인해줘"
> "오늘 미수금 리포트 실행해줘"
> "90일 이상 overdue 항목 알려줘"
```

### 프로그래밍 방식
```python
from ash_bot.main import run_ar_automation

# Dry-run 모드
run_ar_automation(dry_run=True)

# 운영 모드
run_ar_automation(dry_run=False)
```

## 모니터링 (Monitoring)

### 성공 지표
- ✅ Matching rate > 90%
- ✅ 일일 리포트 정상 발송
- ✅ 90+ days overdue 항목 0건 유지
- ✅ API 에러율 < 1%

### 주의 지표
- ⚠️ Matching rate < 80%
- ⚠️ 90+ days overdue 증가
- ⚠️ 연속 API 실패
- ⚠️ 매칭되지 않은 항목 증가

## 에이전트 업데이트 로그

### 2026-02-09: Phase 1 MVP 완료
- 3단계 매칭 로직 구현
- Bill.com, Plaid, Slack, Notion 통합
- 일일/주간 리포트 자동화
- Dry-run 모드 지원

### 다음 계획 (Phase 2)
- Hanmi Bank 통합
- 수동 override 메커니즘
- 중복 payment 감지
- 성능 최적화 (caching, batch processing)

## 문의 및 지원

**담당자**: Seohyun Ahn (Finance Lead)
**프로젝트 시작**: 2026-02-09
**최종 업데이트**: 2026-02-11
