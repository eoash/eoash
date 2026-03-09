"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import KpiCard from "@/components/cards/KpiCard";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import RevenueSegmentChart from "@/components/charts/RevenueSegmentChart";
import RevenueDetailTable from "@/components/charts/RevenueDetailTable";
import { formatKRW, formatUSD, formatPercent, BUDGET_FX_RATE } from "@/lib/utils";
import { useT } from "@/lib/contexts/LanguageContext";
import type { RevenueMonthly, RevenueSegment, RevenueSegmentDetail } from "@/lib/types";

export type CurrencyMode = "KRW" | "USD";

interface RevenueData {
  monthly: RevenueMonthly[];
  months: string[];
  segments: RevenueSegment[];
  segmentDetails: RevenueSegmentDetail[];
  totalActual: number;
  totalTarget: number;
}

export default function RevenueDashboard({ data, year }: { data: RevenueData; year: number }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [currency, setCurrency] = useState<CurrencyMode>("KRW");

  const { monthly, months, segments, segmentDetails, totalActual, totalTarget } = data;

  const toDisplay = (krw: number) => currency === "USD" ? krw / BUDGET_FX_RATE : krw;
  const fmt = (krw: number) => currency === "USD" ? formatUSD(krw / BUDGET_FX_RATE) : formatKRW(krw);

  const achievementRate = totalTarget > 0 ? totalActual / totalTarget : 0;

  // MoM growth (last 2 months with data)
  const monthsWithData = monthly.filter((m) => m.actual > 0);
  let momGrowth = 0;
  if (monthsWithData.length >= 2) {
    const current = monthsWithData[monthsWithData.length - 1].actual;
    const previous = monthsWithData[monthsWithData.length - 2].actual;
    momGrowth = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  // Dynamic period display
  const activeMonths = months.filter((_, i) => monthly[i] && monthly[i].actual > 0);
  const periodLabel = activeMonths.length > 0
    ? locale === "ko"
      ? `${year}년 ${activeMonths[0]} ~ ${activeMonths[activeMonths.length - 1]}`
      : `${year} ${activeMonths[0]} - ${activeMonths[activeMonths.length - 1]}`
    : locale === "ko"
      ? `${year}년`
      : `${year}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t("rev.title")}</h1>
          <select
            value={year}
            onChange={(e) => router.push(`/?year=${e.target.value}`)}
            className="bg-[#111111] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#E8FF47] cursor-pointer"
          >
            {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {/* Currency toggle */}
          <div className="flex rounded-lg border border-[#333] overflow-hidden">
            {(["KRW", "USD"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  currency === c
                    ? "bg-[#E8FF47] text-black"
                    : "bg-[#111111] text-gray-400 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs text-gray-500">{periodLabel}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KpiCard
          title={t("rev.totalRevenue")}
          value={fmt(totalActual)}
          subtitle={`${year} YTD`}
          tooltip={t("rev.totalRevenue.tip")}
        />
        <KpiCard
          title={t("rev.target")}
          value={currency === "USD" ? "$10M" : "₩145억"}
          subtitle={t("rev.target.sub")}
          tooltip={t("rev.target.tip")}
        />
        <KpiCard
          title={t("rev.achievement")}
          value={totalTarget > 0 ? formatPercent(achievementRate) : t("rev.noTarget")}
          subtitle={t("rev.achievement.sub")}
          tooltip={t("rev.achievement.tip")}
          trend={
            achievementRate > 0
              ? { value: Math.round(achievementRate * 100), isPositive: achievementRate >= 1 }
              : undefined
          }
        />
        <KpiCard
          title={t("rev.mom")}
          value={`${momGrowth >= 0 ? "+" : ""}${momGrowth.toFixed(1)}%`}
          subtitle={t("rev.mom.sub")}
          tooltip={t("rev.mom.tip")}
          trend={
            momGrowth !== 0
              ? { value: Math.abs(Math.round(momGrowth)), isPositive: momGrowth > 0 }
              : undefined
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <RevenueTrendChart details={segmentDetails} months={months} currency={currency} />
        </div>
        <div>
          <RevenueSegmentChart data={segments} currency={currency} />
        </div>
      </div>

      {/* Revenue Detail Table */}
      {segmentDetails.length > 0 && (
        <RevenueDetailTable details={segmentDetails} months={months} currency={currency} />
      )}
    </div>
  );
}
