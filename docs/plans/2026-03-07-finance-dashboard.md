# Finance Dashboard Implementation Plan

**Goal:** EO Studio 경영진용 재무 대시보드 — Google Sheets 데이터를 Next.js로 시각화

**Architecture:** Next.js App Router + Server Components에서 Google Sheets API를 호출하고 5분 캐싱. token-dashboard와 동일한 다크 테마 UI 패턴 재사용. recharts로 차트 렌더링.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, recharts 3, googleapis (Sheets API)

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `finance-dashboard/package.json`
- Create: `finance-dashboard/tsconfig.json`
- Create: `finance-dashboard/next.config.ts`
- Create: `finance-dashboard/postcss.config.mjs`
- Create: `finance-dashboard/src/app/globals.css`
- Create: `finance-dashboard/src/app/layout.tsx`
- Create: `finance-dashboard/src/app/page.tsx` (placeholder)

**Step 1: 프로젝트 스캐폴딩**

```bash
cd /Users/ash/Documents/eoash
mkdir -p finance-dashboard
cd finance-dashboard
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --no-import-alias --yes
```

**Step 2: 추가 의존성 설치**

```bash
npm install recharts googleapis
```

**Step 3: globals.css를 token-dashboard 다크 테마로 교체**

```css
@import "tailwindcss";

:root {
  --background: #0a0a0a;
  --foreground: #ededed;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

**Step 4: layout.tsx에 다크 테마 적용**

```tsx
// token-dashboard 패턴 그대로: bg-[#0A0A0A] text-white, Sidebar 포함
```

**Step 5: dev 서버 확인**

```bash
npm run dev
```
Expected: http://localhost:3000 에 빈 다크 테마 페이지

**Step 6: 커밋**

```bash
git add finance-dashboard/
git commit -m "feat(finance-dashboard): 프로젝트 초기화 - Next.js + Tailwind + recharts"
```

---

## Task 2: Google Sheets API 클라이언트

**Files:**
- Create: `finance-dashboard/src/lib/sheets.ts`
- Create: `finance-dashboard/src/lib/types.ts`
- Create: `finance-dashboard/.env.local`

**Step 1: 환경변수 설정**

`.env.local`:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
SPREADSHEET_ID=1Vw4_IszfjrxGa1z51LZ2WmvJ71I5eWPghR-uSr3f0pM
```

참고: 기존 `token_sheets.json`이 OAuth 토큰이라 서버리스(Vercel)에서 사용 불가.
Google Cloud Console에서 Service Account 키를 생성하고 Sheets에 공유 필요.

**Step 2: types.ts 작성**

```typescript
// 각 페이지에서 사용할 데이터 타입 정의
export interface RevenueRow {
  month: string;
  segment: string;
  actual: number;
  target: number;
}

export interface CashPositionRow {
  region: string;      // KR | US | VN
  bank: string;
  currency: string;
  balance: number;
  balanceUsd: number;
}

export interface IncomeRow {
  month: string;
  category: string;
  amount: number;
  type: "revenue" | "expense";
}

export interface FxRate {
  pair: string;        // USD/KRW | USD/VND
  rate: number;
  change: number;      // % change
  date: string;
}
```

**Step 3: sheets.ts 작성**

```typescript
import { google } from "googleapis";

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;

export async function readSheet(sheetName: string, range: string): Promise<string[][]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!${range}`,
  });
  return (res.data.values as string[][]) ?? [];
}

// 각 시트별 fetch 함수
export async function fetchRevenue() { ... }
export async function fetchCashPosition() { ... }
export async function fetchIncome() { ... }
export async function fetchFx() { ... }
```

**Step 4: 테스트 — API Route로 확인**

```bash
# dev 서버에서 /api/sheets?sheet=revenue 호출해서 데이터 확인
curl http://localhost:3000/api/sheets?sheet=revenue
```

**Step 5: 커밋**

```bash
git add finance-dashboard/src/lib/
git commit -m "feat(finance-dashboard): Google Sheets API 클라이언트 + 타입 정의"
```

---

## Task 3: 공통 컴포넌트 (Layout + Cards)

**Files:**
- Create: `finance-dashboard/src/components/layout/Sidebar.tsx`
- Create: `finance-dashboard/src/components/cards/KpiCard.tsx`
- Create: `finance-dashboard/src/lib/utils.ts`

**Step 1: Sidebar 작성**

```typescript
// token-dashboard Sidebar 패턴 재사용
// menuItems: 매출 현황(/), Cash Position(/cash), Income Statement(/income), FX(/fx)
// 액센트 색상: #E8FF47 (token-dashboard와 동일)
```

**Step 2: KpiCard 작성**

```typescript
// token-dashboard KpiCard 그대로 복사 — trend 화살표 포함
```

**Step 3: utils.ts — 포매팅 함수**

```typescript
export function formatKRW(n: number): string {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);
}
export function formatUSD(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
```

**Step 4: layout.tsx에 Sidebar 연결**

**Step 5: 확인** — localhost에서 사이드바 + 빈 페이지 렌더링

**Step 6: 커밋**

```bash
git commit -m "feat(finance-dashboard): Sidebar + KpiCard + 포매팅 유틸"
```

---

## Task 4: 매출 현황 페이지 (메인 — 최우선)

**Files:**
- Create: `finance-dashboard/src/components/charts/RevenueTrendChart.tsx`
- Create: `finance-dashboard/src/components/charts/RevenueSegmentChart.tsx`
- Modify: `finance-dashboard/src/app/page.tsx`
- Modify: `finance-dashboard/src/lib/sheets.ts` (fetchRevenue 구현)

**Step 1: fetchRevenue() 구현**

"2026 매출" 시트에서 데이터를 읽어 `RevenueRow[]`로 변환.

**Step 2: RevenueTrendChart 작성**

```typescript
// recharts BarChart: 월별 actual vs target
// X축: 월, Y축: 금액
// 2개 Bar: actual(#E8FF47), target(#444)
```

**Step 3: RevenueSegmentChart 작성**

```typescript
// recharts PieChart: 사업별 매출 비중 (Donut)
```

**Step 4: page.tsx 조립**

```typescript
// Server Component: revalidate = 300
// KPI: 총 매출, 목표 달성률, MoM 성장률, YoY 비교
// Charts: RevenueTrendChart + RevenueSegmentChart
```

**Step 5: 확인** — localhost에서 매출 차트 렌더링

**Step 6: 커밋**

```bash
git commit -m "feat(finance-dashboard): 매출 현황 페이지 — 트렌드 + 세그먼트 차트"
```

---

## Task 5: Cash Position 페이지

**Files:**
- Create: `finance-dashboard/src/components/cards/CashRegionCard.tsx`
- Create: `finance-dashboard/src/components/charts/CashTrendChart.tsx`
- Create: `finance-dashboard/src/app/cash/page.tsx`

**Step 1: fetchCashPosition() 구현**

"2026 Cash Position Summary" 시트에서 지역/은행별 잔액 읽기.

**Step 2: CashRegionCard — 지역별 카드**

```typescript
// 한국 / 미국 / 베트남 3개 카드
// 각 카드: 은행명, 현지 통화 잔액, USD 환산액
```

**Step 3: CashTrendChart — 월별 캐시 추이**

**Step 4: page.tsx 조립**

```typescript
// KPI: Total Cash (USD), 전월 대비 변동
// Cards: 3개 지역 카드
// Chart: 월별 추이
```

**Step 5: 커밋**

```bash
git commit -m "feat(finance-dashboard): Cash Position 페이지 — 지역별 잔액 + 추이"
```

---

## Task 6: Income Statement 페이지

**Files:**
- Create: `finance-dashboard/src/components/charts/IncomeChart.tsx`
- Create: `finance-dashboard/src/components/charts/ExpenseCategoryChart.tsx`
- Create: `finance-dashboard/src/app/income/page.tsx`

**Step 1: fetchIncome() 구현**

"2026년" 시트에서 수익/비용 데이터 읽기.

**Step 2: IncomeChart — 수익 vs 비용 추이**

```typescript
// recharts BarChart: stacked or grouped
// revenue(green) vs expense(red), 순이익 Line overlay
```

**Step 3: ExpenseCategoryChart — 카테고리별 비용**

```typescript
// recharts PieChart: 인건비, 운영비, 마케팅 등
```

**Step 4: page.tsx 조립 + 커밋**

```bash
git commit -m "feat(finance-dashboard): Income Statement 페이지 — 손익 + 비용 분석"
```

---

## Task 7: FX 페이지

**Files:**
- Create: `finance-dashboard/src/components/charts/FxTrendChart.tsx`
- Create: `finance-dashboard/src/app/fx/page.tsx`

**Step 1: fetchFx() 구현**

환율 데이터는 Sheets에서 읽거나, 외부 환율 API 사용 (fallback).

**Step 2: FxTrendChart — 환율 추이**

```typescript
// recharts LineChart: USD/KRW, USD/VND 듀얼 라인
```

**Step 3: page.tsx 조립**

```typescript
// KPI: 현재 USD/KRW, USD/VND, 주간 변동
// Chart: 환율 추이
```

**Step 4: 커밋**

```bash
git commit -m "feat(finance-dashboard): FX 페이지 — 환율 현황 + 추이"
```

---

## Task 8: Vercel 배포

**Files:**
- Create: `finance-dashboard/vercel.json`

**Step 1: Vercel 프로젝트 연결**

```bash
cd finance-dashboard
npx vercel link
```

**Step 2: 환경변수 설정**

```bash
npx vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
npx vercel env add GOOGLE_PRIVATE_KEY
npx vercel env add SPREADSHEET_ID
```

**Step 3: 배포**

```bash
npx vercel --prod --yes
```

**Step 4: 접속 확인 + 커밋**

```bash
git commit -m "feat(finance-dashboard): Vercel 배포 설정"
```

---

## Summary

| Task | 내용 | 의존성 |
|------|------|--------|
| 1 | 프로젝트 초기화 | 없음 |
| 2 | Sheets API 클라이언트 | Task 1 |
| 3 | 공통 컴포넌트 | Task 1 |
| 4 | 매출 현황 (메인) | Task 2, 3 |
| 5 | Cash Position | Task 2, 3 |
| 6 | Income Statement | Task 2, 3 |
| 7 | FX | Task 2, 3 |
| 8 | Vercel 배포 | Task 4-7 |

Task 2와 3은 병렬 가능. Task 4-7도 병렬 가능 (각 페이지 독립).
