# Finance Agent

## 역할 (Role)

**재무/회계 전반 관리 에이전트** - 한국, 미국, 베트남 3개 지역의 재무 데이터 통합, 캐시플로우 모니터링, FX 관리를 담당하는 에이전트

## 책임 범위 (Responsibilities)

### 1. 캐시플로우 모니터링
- 3개 지역(한국, 미국, 베트남) 은행 잔액 실시간 추적
- 일일/주간/월간 캐시 변동 리포트
- 캐시 부족 예측 및 알림
- 환율 변동에 따른 USD 환산 잔액

### 2. 외환(FX) 관리
- 실시간 환율 모니터링 (USD/KRW, USD/VND)
- 환율 변동 알림 (임계값 기반)
- 외환 거래 타이밍 추천
- FX gain/loss 계산 및 리포팅

### 3. 재무 리포팅
- 월간 재무제표 요약
- 지역별 수익/비용 분석
- 예산 대비 실적 추적
- Executive summary 자동 생성

### 4. 은행 계좌 관리
- **한국**: 하나은행, 신한은행
- **미국**: Mercury Bank (Plaid 연동)
- **베트남**: Techcombank, Vietcombank
- 계좌별 거래 내역 조회 및 분류

### 5. 재무 데이터 통합
- Bill.com, Notion, Google Sheets 데이터 동기화
- 재무 대시보드 자동 업데이트
- 지역별 재무 데이터 통합 뷰 제공

## 사용하는 도구 (Tools)

### API 통합
- **Plaid API**: 미국 은행 계좌 연동 (Mercury)
- **한국 은행 API**: 하나은행, 신한은행 (오픈뱅킹)
- **Exchange Rate API**: 실시간 환율 조회
- **Bill.com API**: 청구서 및 결제 데이터
- **Notion API**: 재무 대시보드 업데이트
- **Google Sheets API**: 재무 데이터 스프레드시트

### 핵심 컴포넌트
- `ash_bot/finance/cash_monitor.py`: 캐시플로우 모니터링
- `ash_bot/finance/fx_tracker.py`: 환율 추적 및 알림
- `ash_bot/finance/financial_reporter.py`: 재무 리포트 생성
- `ash_bot/integrations/bank_clients.py`: 은행 API 클라이언트들

## 워크플로우 (Workflows)

### 일일 캐시플로우 체크 (Daily Cash Check)
```
1. 모든 은행 계좌 잔액 조회
2. 실시간 환율로 USD 환산
3. 전일 대비 변동 계산
4. 캐시 부족 위험 체크 (threshold: $10,000)
5. Slack으로 일일 캐시 리포트 발송
6. Notion 대시보드 업데이트
```

### FX 모니터링 (FX Monitoring)
```
1. 매시간 USD/KRW, USD/VND 환율 조회
2. 변동폭 계산 (1일, 1주, 1개월)
3. 임계값 초과 시 알림:
   - USD/KRW: ±30원 변동
   - USD/VND: ±200 VND 변동
4. 거래 타이밍 추천 (historical data 기반)
```

### 월간 재무 리포트 (Monthly Financial Report)
```
1. 당월 모든 거래 내역 집계
2. 수익/비용 분류 (지역별, 카테고리별)
3. 예산 대비 실적 계산
4. 전월 대비 증감 분석
5. Executive summary 생성
6. Notion에 리포트 발행
7. Slack으로 요약 발송
```

### 은행 거래 분류 (Transaction Categorization)
```
1. 모든 은행 거래 내역 조회
2. AI 기반 카테고리 자동 분류
3. 불명확한 거래는 수동 검토 요청
4. 분류 결과를 Notion/Google Sheets에 동기화
```

## 설정 및 파라미터

### Cash Flow Alerts
- `LOW_CASH_THRESHOLD_USD`: 10000 (USD)
- `CRITICAL_CASH_THRESHOLD_USD`: 5000 (USD)
- `CASH_CHECK_FREQUENCY`: 매일 09:00 UTC

### FX Alert Thresholds
```python
{
    "USD/KRW": {
        "daily_change": 30,    # ±30원
        "weekly_change": 100,  # ±100원
    },
    "USD/VND": {
        "daily_change": 200,   # ±200 VND
        "weekly_change": 500,  # ±500 VND
    }
}
```

### Bank Accounts
```python
ACCOUNTS = {
    "KR": ["하나은행_EO", "신한은행_운영"],
    "US": ["Mercury_Main"],
    "VN": ["Techcombank_EO", "Vietcombank_운영"]
}
```

## 메모리 및 컨텍스트 (Memory & Context)

### Context Files
- `context/bank_accounts.md`: 은행 계좌 정보 및 연동 상태
- `context/fx_policy.md`: 외환 거래 정책 및 가이드라인
- `context/budget.md`: 연간/분기별 예산

### Memory Files
- `memory/cash_state.md`: 현재 캐시 포지션 (지역별, 계좌별)
- `memory/fx_history.md`: 최근 환율 변동 이력
- `memory/financial_decisions.md`: 재무 관련 주요 결정 사항

### Reports Archive
- `reports/daily_cash/YYYY-MM-DD_cash_report.md`
- `reports/monthly_financial/YYYY-MM_financial_report.md`
- `reports/fx_alerts/YYYY-MM-DD_fx_alert.md`

## 스케줄링 (Scheduling)

### 일일 실행
- **캐시플로우 체크**: 매일 09:00 UTC (한국 시간 18:00)
- **FX 체크**: 매시간 정각

### 주간 실행
- **주간 캐시 리포트**: 매주 월요일 09:00 UTC

### 월간 실행
- **월간 재무 리포트**: 매월 1일 09:00 UTC

## 에이전트 호출 방법 (How to Invoke)

### Claude Code에서
```bash
# Finance 에이전트와 대화
> "현재 캐시 포지션 알려줘"
> "오늘 환율 체크해줘"
> "이번 달 재무 리포트 생성해줘"
> "하나은행 최근 거래 내역 조회"
```

## 모니터링 (Monitoring)

### 성공 지표
- ✅ 캐시 리포트 정상 발송
- ✅ FX 알림 정상 동작
- ✅ 은행 API 연결 안정적
- ✅ 데이터 동기화 오류 없음

### 주의 지표
- ⚠️ 캐시 $10,000 이하
- ⚠️ 환율 급변 (threshold 초과)
- ⚠️ 은행 API 연결 실패
- ⚠️ 데이터 동기화 지연

## 에이전트 업데이트 로그

### 2026-02-11: Finance Agent 초기 설정
- 에이전트 역할 정의
- 워크플로우 설계
- 향후 구현 계획 수립

### 다음 계획
- [ ] Plaid 연동 (Mercury Bank)
- [ ] 한국 은행 오픈뱅킹 API 연동
- [ ] FX monitoring 자동화
- [ ] 월간 재무 리포트 자동화

## 문의 및 지원

**담당자**: Seohyun Ahn (Finance Lead)
**프로젝트 시작**: 2026-02-11
**최종 업데이트**: 2026-02-11
