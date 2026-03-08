"use client";

import KpiCard from "@/components/cards/KpiCard";
import MonthlyPnLChart from "@/components/charts/MonthlyPnLChart";
import RevenueCompositionChart from "@/components/charts/RevenueCompositionChart";
import ExpenseTop10Chart from "@/components/charts/ExpenseTop10Chart";
import AnnualTrendChart from "@/components/charts/AnnualTrendChart";
import { WITHTAX_YEARLY } from "@/lib/withtax-data";
import { formatKRW, formatPercent } from "@/lib/utils";
import { useT } from "@/lib/contexts/LanguageContext";

const y2025 = WITHTAX_YEARLY.find((y) => y.year === "2025")!;
const y2024 = WITHTAX_YEARLY.find((y) => y.year === "2024")!;

const totalRevenue = y2025.매출합계;
const totalExpense = y2025.판관비합계;
const netIncome = y2025.당기순이익;
const netMargin = totalRevenue > 0 ? netIncome / totalRevenue : 0;

// YoY 매출 성장률
const revenueGrowth = ((totalRevenue - y2024.매출합계) / y2024.매출합계) * 100;

export default function IncomePage() {
  const { t } = useT();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("income.title")}</h1>
        <span className="text-xs text-gray-500">{t("income.subtitle")}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KpiCard
          title={t("income.totalRevenue")}
          value={formatKRW(totalRevenue)}
          subtitle={t("income.totalRevenue.sub")}
          tooltip={t("income.totalRevenue.tip")}
          trend={{ value: Math.round(revenueGrowth), isPositive: revenueGrowth > 0 }}
        />
        <KpiCard
          title={t("income.totalExpense")}
          value={formatKRW(totalExpense)}
          subtitle={t("income.totalExpense.sub")}
          tooltip={t("income.totalExpense.tip")}
        />
        <KpiCard
          title={t("income.netIncome")}
          value={formatKRW(netIncome)}
          subtitle={t("income.netIncome.sub")}
          tooltip={t("income.netIncome.tip")}
          trend={
            netIncome !== 0
              ? { value: Math.abs(Math.round(netMargin * 100)), isPositive: netIncome > 0 }
              : undefined
          }
        />
        <KpiCard
          title={t("income.netMargin")}
          value={formatPercent(netMargin)}
          subtitle={t("income.netMargin.sub")}
          tooltip={t("income.netMargin.tip")}
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
