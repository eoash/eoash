# CLAUDE.md — Finance Dashboard

## 프로젝트 개요

EO Studio 경영진용 재무 대시보드. 매주 월요일 9시 리더 브리핑에 사용.
매출, A/R, Cash Position, Income Statement, 환율을 한눈에 보여줌.

- **Live**: https://finance-dashboard-opal-xi.vercel.app
- **데이터**: Google Sheets API + 위드택스 정적 데이터

---

## 기술 스택

| 항목 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts 3 |
| Data | Google Sheets API (`googleapis`) + 정적 TS |
| Deploy | Vercel |
| Path alias | `@/*` → `./src/*` |

---

## 페이지 구조

| 경로 | 페이지 | 데이터 소스 |
|------|--------|-----------|
| `/` | 매출 현황 (Revenue) | Google Sheets |
| `/clients` | 클라이언트별 매출 | A/R 시트 |
| `/ar` | A/R(미수금) 현황 | `거래처별 미수금/회수기간 관리표` 시트 |
| `/yoy` | YoY 비교 (2020-2025) | `매출비교` 시트 |
| `/cash` | Cash Position | 시트 Row 0-16(KRW), 18-22(USD), 33-37(VND) |
| `/income` | Income Statement | `withtax-data.ts` (정적) |
| `/fx` | 환율 모니터 | exchangerate-api (실시간) |

---

## 디자인 컨벤션

- **다크 테마**: token-dashboard와 동일 (`#0A0A0A`, 액센트 `#00E87A`)
- **KpiCard**: 공통 카드 + `InfoTip` tooltip
- **국기 이모지**: Cash 페이지 지역 카드 (🇰🇷🇺🇸🇻🇳)
- **모바일**: 햄버거 드로어 + KPI `grid-cols-2` 컴팩트 + 터치 tooltip
- **한/영 전환**: `src/lib/i18n.ts`, Sidebar 하단 토글

---

## 주요 파일

| 파일 | 역할 |
|------|------|
| `src/lib/sheets.ts` | Google Sheets API 헬퍼 (`readSheet`). 시트명에 `/` 포함 시 single quote 감싸기 |
| `src/lib/withtax-data.ts` | 위드택스 세무법인 공식 회계 데이터 (2022-2025, 월 1회 업데이트) |
| `src/lib/utils.ts` | 포맷팅 유틸리티 |
| `src/lib/i18n.ts` | 한/영 번역 |
| `src/lib/contexts/` | LanguageContext (한/영 전환) |
| `src/components/cards/KpiCard.tsx` | KPI 카드 공통 컴포넌트 |
| `src/components/cards/CashRegionCard.tsx` | Cash 지역별 카드 (국기 이모지) |
| `src/components/common/InfoTip.tsx` | 툴팁 (hover + 터치) |
| `src/components/layout/Sidebar.tsx` | 좌측 네비게이션 (7개 메뉴, 모바일 드로어) |
| `src/components/ar/ArDashboard.tsx` | A/R 클라이언트 컴포넌트 (기간 필터) |
| `src/components/cash/CashDashboard.tsx` | Cash 클라이언트 컴포넌트 (화폐 토글) |
| `src/components/charts/` | 16개 차트 컴포넌트 (recharts 기반) |
| `src/app/api/fx/route.ts` | 실시간 환율 API (exchangerate-api 프록시) |

---

## 데이터 소스 상세

### Google Sheets
- **Spreadsheet ID**: `1Vw4_IszfjrxGa1z51LZ2WmvJ71I5eWPghR-uSr3f0pM`
- **인증**: Service Account base64 → `GOOGLE_SA_KEY_BASE64` 환경변수
- SA 이메일을 Sheets에 뷰어로 공유 안 하면 `Requested entity was not found` 에러

### 위드택스 (세무법인)
- `withtax-data.ts`에 정적 하드코딩 (API 없음)
- Looker Studio URL: `https://lookerstudio.google.com/s/mrHnGOvqVDQ`
- 업데이트: 월 1회 세무법인 결산 후 수동 반영
- 용도: Income Statement 페이지 전용

### 환율 API
- **Frankfurter API는 KRW 미지원** (ECB 기반이라 KRW 없음, "not found" 반환)
- **fawazahmed0/currency-api** 사용: KRW+VND historical 모두 지원, API key 불필요
  - Latest: `https://latest.currency-api.pages.dev/v1/currencies/usd.json`
  - Historical: `https://{YYYY-MM-DD}.currency-api.pages.dev/v1/currencies/usd.json`
- open.er-api.com은 fallback (latest only, historical 미지원)

---

## 오답노트 (이 프로젝트 전용)

### Google Sheets
- 시트명에 `/` 포함 시 → `readSheet`에서 single quote(`'시트명'`)로 감싸야 함
- 월 필터링: "합계/목표/달성율" 같은 비월 컬럼 제외 필요 → `/^\d{1,2}월$/` regex

### Vercel + Service Account
- Private Key newline 손상 → SA JSON 전체를 Base64 인코딩해서 저장
- `Buffer.from(env, "base64")`로 디코딩

### recharts
- `layout="vertical"` BarChart + ResponsiveContainer → 바가 렌더링 안 되는 버그 → HTML div 바 사용 권장
- Tooltip 타입: `any` 사용이 실용적

---

## _SYNC_ 탭 구조 (Staging Layer)

원본 시트를 자유롭게 편집해도 대시보드가 깨지지 않도록, Apps Script가 원본 → `_SYNC_` 클론 탭으로 정규화 동기화.

### 동작 원리
```
원본 시트 (ash 편집) → Apps Script (5분마다) → _SYNC_ 탭 (대시보드가 읽음)
```

### _SYNC_ 탭 목록
| 클론 탭 | 원본 탭 | 구조 |
|---------|---------|------|
| `_SYNC_Revenue` | `{year} 매출` | division, category, 1월~12월 |
| `_SYNC_Cash` | `{year} Cash Position Summary` | region, currency, metric, 월별 |
| `_SYNC_Income` | `{year}년` | type, category, 1월~12월 |
| `_SYNC_AR` | `거래처별 미수금/회수기간 관리표` | month, client, amount, ... |
| `_SYNC_YoY` | `매출비교` | year, 1월~12월, total, ... |

### 폴백 규칙
- **현재 연도** → `_SYNC_` 탭 우선, 실패 시 원본 파싱
- **다른 연도** → 원본 탭 직접 파싱 (기존 로직)

### Apps Script 설치
1. Google Sheets → Extensions → Apps Script
2. `scripts/sync-sheets.gs` 코드 붙여넣기
3. `syncAll` 실행 → _SYNC_ 탭 5개 생성
4. (선택) `createTimeTrigger` 실행 → 5분 자동 동기화

### 오답노트
- _SYNC_ 탭을 수동으로 편집하면 다음 동기화 시 덮어씀
- Apps Script의 YEAR는 `new Date().getFullYear()` — 연초에 자동 갱신

---

## 배포

```bash
# 자동 배포: GitHub push → Vercel 자동 빌드
# 수동 배포:
npx vercel --prod
```

### 환경변수 (Vercel)
- `GOOGLE_SA_KEY_BASE64` — Service Account JSON (Base64 인코딩)
