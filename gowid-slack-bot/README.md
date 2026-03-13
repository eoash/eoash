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

## Slack Bot 플로우 (계획)

```
[매일 오전 9시]
  → GET /v1/expenses/not-submitted
  → 개인별 DM: "미제출 N건 있어요" + 목록

[목록 클릭]
  → Slack Modal 오픈
  → 용도 선택 (GET /v1/purposes로 목록)
  → 참석자 선택 (GET /v1/members로 멤버 목록)
  → 메모 입력
  → 제출 → PUT /purposes + /participants + /memo

[관리자]
  → 주간 일괄 승인: PATCH /approval-status/approved
```

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
