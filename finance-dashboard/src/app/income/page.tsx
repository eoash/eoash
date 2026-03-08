import KpiCard from "@/components/cards/KpiCard";
import MonthlyPnLChart from "@/components/charts/MonthlyPnLChart";
import RevenueCompositionChart from "@/components/charts/RevenueCompositionChart";
import ExpenseTop10Chart from "@/components/charts/ExpenseTop10Chart";
import AnnualTrendChart from "@/components/charts/AnnualTrendChart";
import { WITHTAX_YEARLY } from "@/lib/withtax-data";
import { formatKRW, formatPercent } from "@/lib/utils";

export const revalidate = 3600;

const y2025 = WITHTAX_YEARLY.find((y) => y.year === "2025")!;
const y2024 = WITHTAX_YEARLY.find((y) => y.year === "2024")!;

const totalRevenue = y2025.매출합계;
const totalExpense = y2025.판관비합계;
const netIncome = y2025.당기순이익;
const netMargin = totalRevenue > 0 ? netIncome / totalRevenue : 0;

// YoY 매출 성장률
const revenueGrowth = ((totalRevenue - y2024.매출합계) / y2024.매출합계) * 100;

export default function IncomePage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Income Statement</h1>
        <span className="text-xs text-gray-500">위드택스 공식 회계 · 2025년 확정</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KpiCard
          title="총 매출"
          value={formatKRW(totalRevenue)}
          subtitle="2025 연간"
          tooltip="위드택스 공식 회계장부 기준 2025년 전체 매출"
          trend={{ value: Math.round(revenueGrowth), isPositive: revenueGrowth > 0 }}
        />
        <KpiCard
          title="총 판관비"
          value={formatKRW(totalExpense)}
          subtitle="2025 연간"
          tooltip="급여, 외주, 복리후생, IT서비스 등 판매관리비 합계"
        />
        <KpiCard
          title="당기순이익"
          value={formatKRW(netIncome)}
          subtitle="매출 - 판관비 ± 영업외"
          tooltip="영업이익에 영업외수익/비용을 반영한 최종 손익"
          trend={
            netIncome !== 0
              ? { value: Math.abs(Math.round(netMargin * 100)), isPositive: netIncome > 0 }
              : undefined
          }
        />
        <KpiCard
          title="순이익률"
          value={formatPercent(netMargin)}
          subtitle="당기순이익 / 매출"
          tooltip="순이익 ÷ 총 매출. 양수면 흑자, 음수면 적자. 2024년은 -45.2%"
          trend={
            netMargin !== 0
              ? { value: Math.abs(Math.round(netMargin * 100)), isPositive: netMargin > 0 }
              : undefined
          }
        />
      </div>

      {/* Row 1: Monthly P&L + Revenue Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <MonthlyPnLChart />
        </div>
        <div>
          <RevenueCompositionChart />
        </div>
      </div>

      {/* Row 2: Expense TOP 10 + Annual Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseTop10Chart />
        <AnnualTrendChart />
      </div>
    </div>
  );
}
