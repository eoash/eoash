# Finance Dashboard Design

## Overview
- Purpose: Executive reporting dashboard for EO Studio
- Stack: Next.js (App Router) + Tailwind + shadcn/ui + recharts
- Data: Google Sheets API direct integration
- Deploy: Vercel
- Location: `finance-dashboard/` (monorepo sub-project)

## Pages

### 1. Revenue (Main `/`) - Highest Priority
- Monthly revenue trend (Bar/Line chart)
- Revenue by business segment (Donut chart)
- Target vs actual achievement rate
- YoY comparison (2025 vs 2026)

### 2. Cash Position (`/cash`)
- Bank balance cards by region (KR/US/VN)
- USD-converted total
- Monthly cash flow trend

### 3. Income Statement (`/income`)
- Monthly revenue vs expense trend
- Expense by category (payroll, operations, etc.)
- Net margin trend

### 4. FX (`/fx`)
- Current USD/KRW, USD/VND rates
- Exchange rate trend chart
- FX gain/loss impact

## Tech Structure
```
finance-dashboard/
  src/
    app/
      page.tsx            <- Revenue (main)
      cash/page.tsx
      income/page.tsx
      fx/page.tsx
      api/sheets/route.ts <- Sheets API proxy
    lib/
      sheets.ts           <- Google Sheets API client
      utils.ts
    components/
      charts/             <- Chart components (recharts)
      cards/              <- KPI cards
      layout/             <- Sidebar, header
```

## Data Flow
```
Google Sheets -> Next.js Server Component (revalidate: 300s) -> UI
```

## Data Source
- Spreadsheet ID: `1Vw4_IszfjrxGa1z51LZ2WmvJ71I5eWPghR-uSr3f0pM`
- Sheets: "2026 매출", "2026 Cash Position Summary", "2026년" (Income Statement), "2025 현금 시재"
- Auth: Google Service Account (or existing token_sheets.json flow)

## Approved: 2026-03-07
