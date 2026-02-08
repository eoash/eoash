# AR 데이터 구조 및 정의

## Invoice 데이터 구조

Bill.com API에서 반환되는 Invoice 객체:

```json
{
  "id": "unique_invoice_id",
  "invoiceNumber": "INV-2026-001",
  "amount": 5000.00,
  "customerName": "Client ABC Corp",
  "customerEmail": "accounting@clientabc.com",
  "dueDate": "2026-02-15",
  "status": "unpaid",  // "unpaid", "paid", "draft"
  "createdDate": "2026-01-15",
  "paidDate": null,
  "notes": "Optional notes"
}
```

**주요 필드**:
- `id`: Bill.com 내부 ID (update시 필요)
- `invoiceNumber`: Invoice 번호 (고객에게 표시)
- `amount`: Invoice 금액 (USD)
- `status`: Invoice 상태
- `dueDate`: 결제 예정일 (aging 계산에 사용)
- `paidDate`: 실제 결제일 (update시 입력)

---

## Transaction 데이터 구조

Plaid API에서 반환되는 Transaction 객체:

```json
{
  "id": "transaction_id",
  "accountId": "chase_account_id",
  "date": "2026-02-09",
  "amount": 5000.00,
  "description": "WIRE TRANSFER FROM CLIENT ABC",
  "merchantName": "CLIENT ABC CORP",
  "category": ["TRANSFER", "INCOMING"],
  "pending": false,
  "paymentChannel": "online"
}
```

**주요 필드**:
- `amount`: 트랜잭션 금액 (양수 = 입금)
- `date`: 거래 날짜
- `description`: 거래 설명 (Invoice # 포함될 수 있음)
- `pending`: false만 처리 (확정 거래)
- `paymentChannel`: "online" 등

---

## Aging 버킷 정의

AR을 overdue 기간별로 분류:

```python
AGING_BUCKETS = {
    "current": (0, 30),      # 0-30일: 미수금이지만 정상
    "31_60": (31, 60),       # 31-60일: 약간 overdue
    "61_90": (61, 90),       # 61-90일: 더 overdue
    "90_plus": (91, inf)     # 90일 이상: 심각한 overdue
}
```

**계산 방식**:
```
days_overdue = (현재날짜 - due_date).days
if days_overdue < 0:
    days_overdue = 0  // 아직 due 안됨
```

---

## AR Matching 로직

### Matching 규칙 (우선순위):

1. **Exact Match** (신뢰도 100%)
   - Amount: 정확히 일치 (tolerance: $0.01)
   - Payment date >= Invoice create date
   - 첫 번째로 매칭되는 invoice와 매칭

2. **Invoice Number Extraction** (신뢰도 95%)
   - Payment description에서 "INV-123" 형식의 invoice # 추출
   - 해당 invoice와 매칭
   - Amount는 약간의 차이 허용 (tolerance: $1.00)

3. **Fuzzy Customer Name Match** (신뢰도 50-80%)
   - Payment의 merchant_name과 Invoice의 customer_name 비교
   - 유사성 > 70%일 때만 매칭
   - 마지막 수단

### Matching 불가 시나리오:

- Multiple invoices same amount (ambiguous)
- Payment amount가 모든 invoice와 다름
- Customer name과 payment description이 전혀 일치 안 함
- Payment date가 invoice date보다 이전

---

## Report 구조

### Daily Report

```json
{
  "type": "daily",
  "generated_at": "2026-02-09T09:00:00",
  "summary": "✅ 2 payments processed, $8,500 collected",
  "new_payments": [
    "Invoice #1234: $5,000 (Client ABC)",
    "Invoice #5678: $3,500 (Client XYZ)"
  ],
  "total_paid_today": 8500,
  "outstanding_total": 35500,
  "outstanding_by_aging": {
    "current": 25000,
    "31_60": 8000,
    "61_90": 2000,
    "90_plus": 500
  }
}
```

### Weekly Report

```json
{
  "type": "weekly",
  "generated_at": "2026-02-09T09:00:00",
  "week_metrics": {
    "total_collected": 35000,
    "payments_processed": 8,
    "week_over_week_change": 5000,
    "wow_change_pct": 16.7
  },
  "top_overdue_invoices": [
    {
      "invoice_number": "INV-2025-100",
      "customer": "Client DEF",
      "amount": 2000,
      "days_overdue": 150
    }
  ]
}
```

---

## Status 정의

### Invoice Status:
- `unpaid`: 미결제
- `paid`: 결제됨
- `draft`: 임시 저장

### Workflow Status:
- `pending`: 시작 전
- `in_progress`: 실행 중
- `completed`: 정상 완료
- `failed`: 오류로 실패
- `partial`: 일부만 성공

---

## 에러 처리 및 Validation

### Bill.com API:
- Rate limiting: 1회/초 권장
- Timeout: 30초
- 실패 시 retry: exponential backoff (max 3회)

### Plaid API:
- Pending 거래는 제외 (확정 거래만)
- 음수 금액은 제외 (출금, 환불 등)
- Timezone: America/Los_Angeles

### Matching Validation:
- Amount tolerance: $0.01 (exact), $1.00 (fuzzy)
- Confidence threshold: 70% (fuzzy match)
- Multiple matches: 가장 높은 confidence 선택

---

## 메모리 파일 위치

- `agent/memory/financial_state.md`: 현재 AR 상태, 주요 메트릭
- `agent/memory/decisions.md`: Matching 규칙 변경, 정책 결정
- `agent/memory/last_run.json`: 최근 실행 결과, timestamp
