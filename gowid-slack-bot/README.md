# Gowid Slack Bot

Gowid 법인카드 API와 Slack을 연동한 지출 자동화 봇.

## 목적

- 미제출 영수증 Slack 알림
- Slack에서 용도 / 메모 / 참석자 입력 (Gowid 앱 없이)
- 관리자 다건 승인 자동화

## 상태

- [x] API 스펙 분석 완료
- [x] 데이터 구조 파악 완료 (일반_202602.xlsx 기준)
- [ ] API Key 발급 신청 완료 (응답 대기 중)
- [ ] Slack App 생성
- [ ] 개발 시작

## API 정보

- **BASE_URL**: `https://openapi.gowid.com`
- **인증**: HTTP Header `Authorization: {API Key}`
- **Swagger**: https://openapi.gowid.com/swagger-ui/index.html
- **문서**: https://teamgowid.notion.site/Gowid-Open-API-53711c9d57d8451dbf528416e761b379

## 주요 API 엔드포인트

| 기능 | Method | Path |
|------|--------|------|
| 미제출 영수증 목록 | GET | `/v1/expenses/not-submitted` |
| 지출내역 목록/검색 | GET | `/v1/expenses` |
| 지출내역 단건 조회 | GET | `/v1/expenses/{expenseId}` |
| 멤버 목록 조회 | GET | `/v1/members` |
| 사용용도 목록 조회 | GET | `/v1/purposes` |
| 용도 입력 | PUT | `/v1/expenses/{expenseId}/purposes` |
| 메모 입력 | PUT | `/v1/expenses/{expenseId}/memo` |
| 참석자 입력 | PUT | `/v1/expenses/{expenseId}/participants` |
| 승인 상태 변경 | PUT | `/v1/expenses/{expenseId}/approval-status` |
| 다건 승인 | PATCH | `/v1/expenses/approval-status/approved` |
| 댓글 추가 | POST | `/v1/expenses/{expenseId}/comments` |

## 데이터 구조 (Excel 기준)

지출 내역 주요 필드:

| 필드 | 설명 |
|------|------|
| 번호 | 지출 순번 |
| 사용일자 / 사용시간 | 결제 일시 |
| 카드사 / 카드번호 | 롯데카드 / 신한카드 |
| 이용금액(원) | 결제 금액 |
| 내부 사용자 | 내부 참석자 |
| 외부 사용자 | 외부 참석자 |
| 메모 | 자유 메모 |
| 소지자 / 제출자 | 카드 소지자 |
| 부서명 / 직급 | 조직 정보 |
| 용도 | 지출 분류 (점심식비, IT서비스 이용료 등) |
| 필수 정보 | 용도별 필수 입력항목 |
| 제출 및 승인상태 | 미제출 / 승인대기 / 승인완료 |
| 가맹점명 / 가맹점 주소 | 결제처 |

## 자동화 전략

지출 유형에 따라 3단계로 분류:

| 유형 | 예시 | 자동화 수준 |
|------|------|------------|
| **완전 자동** | Airtable, Notion, Zoom 등 구독/고정 | 터치 없이 자동 제출 |
| **참석자만 선택** | 식대, 커피 | 용도 자동 추천 + 참석자만 선택 |
| **메모 필수** | 소모품비, 업무추진비 | 결제 직후 Slack 푸시 → 메모 입력 |

## Slack Bot 플로우 (계획)

```
[결제 발생 감지 — 롯데카드 5분, 신한카드 1시간]
  ① 반복 결제 목록과 매칭 → 자동 제출 + "N건 자동 처리됨" 요약
  ② 식대 → "누구랑 먹었어요?" Slack Modal (참석자 선택만)
  ③ 소모품비/업무추진비 → "뭐 샀어요?" Slack 푸시 (메모 입력)

[관리자]
  → 주간 일괄 승인: PATCH /approval-status/approved
```

## 완전 자동 제출 목록 (2025년 데이터 기준)

과거 1년치 데이터 분석으로 추출한 반복 결제 목록. 매월 동일 패턴으로 자동 제출.

### 12개월 연속 반복 (자동화 확실)

| 가맹점 | 월 평균금액 | 용도 |
|--------|------------|------|
| AIRTABLE.COM/BILL | 100만원 | IT서비스 이용료 |
| NOTION LABS, INC. | 52.8만원 | IT서비스 이용료 |
| ZOOM.COM | 22.7만원 | IT서비스 이용료 |
| 자동결제_3 | 21.1만원 | IT서비스 이용료 |
| ZAPIER.COM/CHARGE | 15만원 | IT서비스 이용료 |
| NICE_통신판매 | 11.9만원 | IT서비스 이용료 |
| 자동결제 | 11.9만원 | 노트북 대여(정기결제) |
| GEEKBOT LTD | 10.7만원 | IT서비스 이용료 |
| INTUIT *QBOOKS ONLINE | 5.2만원 | IT서비스 이용료 |
| MONDAY.COM | 5.8만원 | IT서비스 이용료 |
| 자동결제_0 | 2.1만원 | IT서비스 이용료 |
| 결제대행_3 | 0.8만원 | 멤버십 구독료 |

### 6개월+ 반복 (자동화 가능)

| 가맹점 | 출현월수 | 용도 |
|--------|---------|------|
| FIGMA | 9개월 | IT서비스 이용료 |
| 한국정보통신(주) | 10개월 | IT서비스 이용료 |
| 쏘카 | 11개월 | 유류비 |
| Adobe | 6개월 | IT서비스 이용료 |
| GAMMA.APP | 6개월 | IT서비스 이용료 |
| 페이플_일반(구) | 6개월 | IT서비스 이용료 |

## 용도 현황 (2월 기준 Top 5)

| 용도 | 건수 |
|------|------|
| 점심식비 | 154건 |
| 미국법인-식비 | 124건 |
| IT서비스 이용료 | 113건 |
| 미국법인-여비교통비 | 108건 |
| 야근식비 | 81건 |

## 카드사별 업데이트 주기

- 롯데카드: 5분 단위
- 신한카드: 1시간 단위 (스크래핑)
- 전 카드사: 하루 1회 매입내역 직연동
