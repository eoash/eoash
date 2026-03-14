"use client";

import { useState } from "react";
import KpiCard from "@/components/cards/KpiCard";
import MonthlyPnLChart from "@/components/charts/MonthlyPnLChart";
import RevenueCompositionChart from "@/components/charts/RevenueCompositionChart";
import ExpenseTop10Chart from "@/components/charts/ExpenseTop10Chart";
import AnnualTrendChart from "@/components/charts/AnnualTrendChart";
import { formatKRW, formatPercent } from "@/lib/utils";
import { useT } from "@/lib/contexts/LanguageContext";
import type { WithtaxMonthly, WithtaxYearly, ExpenseItem } from "@/lib/withtax-data";

interface Props {
  yearly: WithtaxYearly[];
  monthly: WithtaxMonthly[];
  expenses: ExpenseItem[];
  lastUpdated: string;
  detailYear: string;
}

export default function IncomeDashboard({ yearly, monthly, expenses, lastUpdated, detailYear }: Props) {
  const { t } = useT();
  const availableYears = yearly.map((y) => y.year);
  const [selectedYear, setSelectedYear] = useState(detailYear);

  const yearData = yearly.find((y) => y.year === selectedYear) ?? yearly[yearly.length - 1];
  const prevYearData = yearly.find((y) => y.year === String(Number(selectedYear) - 1));

  const totalRevenue = yearData.매출합계;
  const totalExpense = yearData.판관비합계;
  const netIncome = yearData.당기순이익;
  const netMargin = totalRevenue > 0 ? netIncome / totalRevenue : 0;
  const revenueGrowth =
    prevYearData && prevYearData.매출합계 > 0
      ? ((totalRevenue - prevYearData.매출합계) / prevYearData.매출합계) * 100
      : 0;

  const showDetail = selectedYear === detailYear;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t("income.title")}</h1>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-[#111111] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#00E87A] cursor-pointer"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-gray-500">{t("income.subtitle")}</span>
        <span className="text-xs text-yellow-500/80 flex items-center gap-1">
          ⚠ 데이터 기준일: {lastUpdated} (위드택스)
        </span>
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

      {/* Row 1: Monthly P&L + Revenue Composition (상세 연도만) */}
      {showDetail && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <MonthlyPnLChart monthly={monthly} />
          </div>
          <div>
            <RevenueCompositionChart yearData={yearData} />
          </div>
        </div>
      )}

      {/* Row 2: Expense TOP 10 (상세 연도만) + Annual Trend (항상) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {showDetail && <ExpenseTop10Chart expenses={expenses} />}
        <AnnualTrendChart yearly={yearly} />
      </div>
    </div>
  );
}
