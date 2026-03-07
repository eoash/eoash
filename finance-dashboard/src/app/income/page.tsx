import KpiCard from "@/components/cards/KpiCard";
import IncomeChart from "@/components/charts/IncomeChart";
import ExpenseCategoryChart from "@/components/charts/ExpenseCategoryChart";
import { fetchIncome } from "@/lib/sheets";
import { formatKRW, formatPercent } from "@/lib/utils";

export const revalidate = 300;

export default async function IncomePage() {
  let data;
  try {
    data = await fetchIncome();
  } catch (error) {
    console.error("[IncomePage] fetchIncome failed:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Income Statement</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400 mb-2">데이터를 불러올 수 없습니다</p>
          <p className="text-sm text-gray-600">Google Sheets API 연결을 확인해주세요</p>
        </div>
      </div>
    );
  }

  const { monthly, expenses, totalRevenue, totalExpense } = data;
  const netIncome = totalRevenue - totalExpense;
  const netMargin = totalRevenue > 0 ? netIncome / totalRevenue : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Income Statement</h1>
        <span className="text-xs text-gray-500">2026년 기준</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="총 수익"
          value={formatKRW(totalRevenue)}
          subtitle="2026 YTD"
        />
        <KpiCard
          title="총 비용"
          value={formatKRW(totalExpense)}
          subtitle="2026 YTD"
        />
        <KpiCard
          title="순이익"
          value={formatKRW(netIncome)}
          subtitle="수익 - 비용"
          trend={
            netIncome !== 0
              ? { value: Math.abs(Math.round(netMargin * 100)), isPositive: netIncome > 0 }
              : undefined
          }
        />
        <KpiCard
          title="순이익률"
          value={formatPercent(netMargin)}
          subtitle="순이익 / 수익"
          trend={
            netMargin !== 0
              ? { value: Math.abs(Math.round(netMargin * 100)), isPositive: netMargin > 0 }
              : undefined
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <IncomeChart data={monthly} />
        </div>
        <div>
          <ExpenseCategoryChart data={expenses} />
        </div>
      </div>
    </div>
  );
}
