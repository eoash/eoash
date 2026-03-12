# EO Studio — Finance Dashboard

> **Note**: 이 프로젝트는 모노레포 [`eoash/eoash`](https://github.com/eoash/eoash)의 `finance-dashboard/` 디렉토리로 이전되었습니다.
> 기존 서브레포 `eoash/eo-finance-dashboard`는 더 이상 업데이트되지 않습니다.

EO Studio 경영진용 재무 대시보드. 매출, A/R, Cash Position, Income Statement, 환율을 한눈에 보여줍니다.

**Live →** https://finance-dashboard-opal-xi.vercel.app
**Repository →** https://github.com/eoash/eoash/tree/main/finance-dashboard

---

## 기술 스택

| 항목 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts 3 |
| Data | Google Sheets API + 위드택스 정적 데이터 |
| Deploy | Vercel |

## 페이지

| 경로 | 페이지 |
|------|--------|
| `/` | Revenue (매출 현황) |
| `/clients` | Clients (클라이언트별 매출) |
| `/ar` | A/R (미수금 현황) |
| `/yoy` | YoY (연도별 비교) |
| `/cash` | Cash Position |
| `/income` | Income Statement |
| `/fx` | FX (환율 모니터) |

## 시작하기

```bash
git clone https://github.com/eoash/eoash.git
cd eoash/finance-dashboard
cp .env.example .env.local  # GOOGLE_SA_KEY_BASE64 설정
npm install && npm run dev
```

---

Internal use only — EO Studio
