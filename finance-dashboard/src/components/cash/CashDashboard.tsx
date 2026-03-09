"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import KpiCard from "@/components/cards/KpiCard";
import InfoTip from "@/components/common/InfoTip";
import CashTrendChart from "@/components/charts/CashTrendChart";
import type { CashMonthly, CurrencyUnit } from "@/lib/types";
import { formatKRW, formatUSD, formatVND, formatNumber } from "@/lib/utils";
import { useT } from "@/lib/contexts/LanguageContext";

interface CashData {
  months: string[];
  monthlyData: CashMonthly[];
  exchangeRates: { usdKrw: number; usdVnd: number };
  burnRate: number;
  runway: number;
}

const REGION_FLAG: Record<string, string> = { KR: "🇰🇷", US: "🇺🇸", VN: "🇻🇳" };

const CURRENCY_BUTTONS: { key: CurrencyUnit; label: string }[] = [
  { key: "KRW", label: "₩ KRW" },
  { key: "USD", label: "$ USD" },
  { key: "VND", label: "₫ VND" },
];

function convertKrw(amountKrw: number, target: CurrencyUnit, rates: { usdKrw: number; usdVnd: number }): number {
  if (target === "KRW") return amountKrw;
  if (target === "USD") return rates.usdKrw > 0 ? amountKrw / rates.usdKrw : 0;
  if (target === "VND") return rates.usdVnd > 0 ? (amountKrw / rates.usdKrw) * rates.usdVnd : 0;
  return amountKrw;
}

function formatCurrency(amount: number, unit: CurrencyUnit): string {
  if (unit === "KRW") return formatKRW(amount);
  if (unit === "USD") return formatUSD(amount);
  if (unit === "VND") return formatVND(amount);
  return formatNumber(amount);
}

const YEAR_OPTIONS = [2026, 2025, 2024, 2023, 2022];

function derivePeriodLabel(months: string[], year: number): string {
  if (months.length === 0) return `${year}년`;
  // months are like ["2026.01", "2026.02", "2026.03"]
  const firstMonth = parseInt(months[0].split(".")[1] || "1", 10);
  const lastMonth = parseInt(months[months.length - 1].split(".")[1] || "12", 10);
  return `${year}년 ${firstMonth}월 ~ ${lastMonth}월`;
}

export default function CashDashboard({ data, year }: { data: CashData; year: number }) {
  const { t } = useT();
  const router = useRouter();
  const [currency, setCurrency] = useState<CurrencyUnit>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cash-currency");
      if (saved && (["KRW", "USD", "VND"] as string[]).includes(saved)) return saved as CurrencyUnit;
    }
    return "KRW";
  });

  useEffect(() => {
    localStorage.setItem("cash-currency", currency);
  }, [currency]);
  const { monthlyData, exchangeRates, burnRate, runway } = data;

  const latest = monthlyData[monthlyData.length - 1];
  const prev = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;

  if (!latest) return <p className="text-gray-500">{t("common.noData")}</p>;

  const fmt = (krw: number) => formatCurrency(convertKrw(krw, currency, exchangeRates), currency);

  // % change
  const balanceChange = prev && prev.totalBalanceKrw > 0
    ? ((latest.totalBalanceKrw - prev.totalBalanceKrw) / prev.totalBalanceKrw) * 100
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t("cash.title")}</h1>
          <select
            value={year}
            onChange={(e) => router.push(`/cash?year=${e.target.value}`)}
            className="bg-[#111111] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-[#00E87A] transition-colors cursor-pointer appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: "28px" }}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <span className="text-xs text-gray-500">{derivePeriodLabel(data.months, year)}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#111] border border-[#222] rounded-lg p-0.5">
            {CURRENCY_BUTTONS.map((btn) => (
              <button
                key={btn.key}
                onClick={() => setCurrency(btn.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  currency === btn.key
                    ? "bg-[#00E87A]/15 text-[#00E87A]"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500">
            {latest.month} {t("common.basis")}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KpiCard
          title={t("cash.totalCash")}
          value={fmt(latest.totalBalanceKrw)}
          subtitle={t("cash.totalCash.sub")}
          tooltip={t("cash.totalCash.tip")}
          trend={balanceChange !== 0 ? { value: Math.abs(Math.round(balanceChange)), isPositive: balanceChange > 0 } : undefined}
        />
        <KpiCard
          title={t("cash.burnRate")}
          value={fmt(burnRate)}
          subtitle={t("cash.burnRate.sub")}
          tooltip={t("cash.burnRate.tip")}
        />
        <KpiCard
          title={t("cash.runway")}
          value={`${runway.toFixed(1)}${t("common.months")}`}
          subtitle={t("cash.runway.sub")}
          tooltip={t("cash.runway.tip")}
          trend={runway < 6 ? { value: Math.round(runway), isPositive: false } : undefined}
        />
        <KpiCard
          title={t("cash.netChange")}
          value={fmt(latest.totalNetChangeKrw)}
          subtitle={`${latest.month}`}
          tooltip={t("cash.netChange.tip")}
          trend={latest.totalNetChangeKrw !== 0
            ? { value: Math.abs(Math.round(latest.totalNetChangeKrw / 1e6)), isPositive: latest.totalNetChangeKrw > 0 }
            : undefined}
        />
      </div>

      {/* Region Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {latest.regions.map((region) => {
          const prevRegion = prev?.regions.find((r) => r.region === region.region);
          const change = prevRegion && prevRegion.balanceKrw > 0
            ? ((region.balanceKrw - prevRegion.balanceKrw) / prevRegion.balanceKrw) * 100
            : 0;

          return (
            <div key={region.region} className="rounded-xl bg-[#111111] border border-[#222] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="text-base">{REGION_FLAG[region.region] ?? ""}</span>
                  {region.regionLabel}
                  <InfoTip text={`${region.regionLabel} cash status`} />
                </p>
                {region.localCurrency !== "KRW" && currency === "KRW" && (
                  <span className="text-xs text-gray-600">
                    ({region.localCurrency} {formatNumber(region.balanceLocal)})
                  </span>
                )}
              </div>
              <div className="flex items-end gap-2">
                <span className="text-xl font-bold text-white">{fmt(region.balanceKrw)}</span>
                {change !== 0 && (
                  <span className={`text-sm font-medium ${change > 0 ? "text-green-400" : "text-red-400"}`}>
                    {change > 0 ? "↑" : "↓"}{Math.abs(Math.round(change))}%
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-gray-600">{t("cash.inflows")}</p>
                  <p className="text-green-400">{fmt(region.inflowsKrw)}</p>
                </div>
                <div>
                  <p className="text-gray-600">{t("cash.outflows")}</p>
                  <p className="text-red-400">{fmt(region.outflowsKrw)}</p>
                </div>
                <div>
                  <p className="text-gray-600">{t("cash.net")}</p>
                  <p className={region.netChangeKrw >= 0 ? "text-green-400" : "text-red-400"}>
                    {fmt(region.netChangeKrw)}
                  </p>
                </div>
              </div>
              {/* 비중 바 */}
              <div className="mt-3 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00E87A] rounded-full"
                  style={{ width: `${latest.totalBalanceKrw > 0 ? (region.balanceKrw / latest.totalBalanceKrw) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {t("cash.share")} {latest.totalBalanceKrw > 0 ? ((region.balanceKrw / latest.totalBalanceKrw) * 100).toFixed(1) : 0}%
              </p>
            </div>
          );
        })}
      </div>

      {/* Cash Trend Chart */}
      <CashTrendChart monthlyData={monthlyData} currency={currency} exchangeRates={exchangeRates} />
    </div>
  );
}
