# AR Automation 주요 결정 및 정책

## 설계 결정 (Design Decisions)

### 1. Matching Strategy
**결정**: 3단계 매칭 전략 (Exact → Number Extraction → Fuzzy)
- **이유**: 정확성과 유연성의 균형
- **신뢰도 임계값**: Fuzzy match는 70% 이상만 매칭
- **실패 처리**: 매칭 불가능한 payment는 수동 검토 큐로

### 2. Update Approach
**결정**: Bill.com에 자동으로 status 업데이트
- **Dry-run mode**: 초기 테스트는 dry-run으로 검증
- **Logging**: 모든 업데이트 로깅 (audit trail)
- **실패 처리**: 실패 시 Slack alert 발송

### 3. Report Schedule
**결정**: Daily report + Weekly detailed report
- **Daily**: 매일 9:00 UTC (오전 1:00 PT)
  - 어제 수금 내역
  - 현재 outstanding AR 요약

- **Weekly**: 매주 월요일 9:00 UTC
  - Week-over-week 비교
  - Top overdue invoices
  - Aging analysis

### 4. Notification Channels
**결정**: Slack (실시간) + Notion (기록)
- **Slack #finance-ar-daily**: 일일 보고서
- **Slack #finance-ar-alerts**: 긴급 알림 (90+ days overdue)
- **Notion AR Database**: 장기 기록 및 대시보드

### 5. Error Handling
**결정**: Graceful degradation with alerts
- **API 실패**: 부분 실패 시에도 가능한 범위에서 계속
- **Missing data**: null 허용, default로 fallback
- **Notification failures**: 로그만 남기고 계속

---

## Policy 결정 (Policy Decisions)

### 1. Amount Matching Tolerance
- **Exact match**: ±$0.01
- **Number extraction**: ±$1.00
- **Fuzzy match**: ±5% of amount
- **근거**: 입금 수수료 등의 변동성 고려

### 2. Payment Date Logic
- **Rule**: Payment date >= Invoice created date
- **Rationale**: Past-dated payments 방지

### 3. Aging Bucket Thresholds
```
Current:  0-30 days
31-60:   31-60 days
61-90:   61-90 days
90+:     91+ days
```
- **변경 예정**: 업계 표준 (현재는 30일 기준)

### 4. Overdue Alert Threshold
- **90+ days**: Slack alert 발송
- **60+ days**: Weekly report에 강조
- **30+ days**: Daily report에 포함

### 5. Match Confidence Reporting
- **High confidence** (95%+): 자동 업데이트
- **Medium** (70-94%): 자동 업데이트 + 리포트 강조
- **Low** (<70%): 리포트만, 수동 검토 필요

---

## 향후 변경 예정 (Backlog)

### Phase 2
- [ ] Hanmi Bank integration
- [ ] Manual override mechanism (disputed payments)
- [ ] Duplicate payment detection
- [ ] Multi-currency support (if needed)

### Phase 3
- [ ] Korea region expansion
- [ ] Vietnam region expansion
- [ ] Predictive AR analytics
- [ ] Auto-generated follow-up emails

### Phase 4
- [ ] Machine learning for matching
- [ ] Early payment incentive calculation
- [ ] Revenue forecasting
- [ ] Cash flow projection

---

## 조직 정책 (Org Policy)

### Access Control
- **Bill.com API**: Finance team only
- **Plaid**: Finance team only (Chase account)
- **Slack integration**: Company-wide (read-only reports)
- **Notion**: Finance + Operations team

### Data Retention
- **Daily logs**: 90 days
- **Weekly reports**: 2 years
- **Monthly archives**: Indefinite

### SLA / Performance Targets
- **Daily run**: 9:00 UTC ±5 minutes
- **Success rate**: 99%+ (target)
- **Matching rate**: 90%+ (target)
- **Report delivery**: <10 minutes after completion

---

**Last Updated**: 2026-02-09
**Next Review**: 2026-03-09 (1 month after launch)
