"use client";

import { useState } from "react";
import KpiCard from "@/components/cards/KpiCard";
import InfoTip from "@/components/common/InfoTip";
import CashTrendChart from "@/components/charts/CashTrendChart";
import type { CashMonthly, CurrencyUnit } from "@/lib/types";
import { formatKRW, formatUSD, formatVND, formatNumber } from "@/lib/utils";

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

export default function CashDashboard({ data }: { data: CashData }) {
  const [currency, setCurrency] = useState<CurrencyUnit>("KRW");
  const { monthlyData, exchangeRates, burnRate, runway } = data;

  const latest = monthlyData[monthlyData.length - 1];
  const prev = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;

  if (!latest) return <p className="text-gray-500">데이터가 없습니다</p>;

  const fmt = (krw: number) => formatCurrency(convertKrw(krw, currency, exchangeRates), currency);

  // % change
  const balanceChange = prev && prev.totalBalanceKrw > 0
    ? ((latest.totalBalanceKrw - prev.totalBalanceKrw) / prev.totalBalanceKrw) * 100
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cash Position</h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#111] border border-[#222] rounded-lg p-0.5">
            {CURRENCY_BUTTONS.map((btn) => (
              <button
                key={btn.key}
                onClick={() => setCurrency(btn.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  currency === btn.key
                    ? "bg-[#E8FF47]/15 text-[#E8FF47]"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500">
            {latest.month} 기준
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KpiCard
          title="Total Cash"
          value={fmt(latest.totalBalanceKrw)}
          subtitle="전 지역 합산"
          tooltip="한국·미국·베트남 3개 법인 현금 잔고 합계"
          trend={balanceChange !== 0 ? { value: Math.abs(Math.round(balanceChange)), isPositive: balanceChange > 0 } : undefined}
        />
        <KpiCard
          title="Monthly Burn Rate"
          value={fmt(burnRate)}
          subtitle="월평균 지출"
          tooltip="데이터가 있는 월의 Total Cash Outflows 평균"
        />
        <KpiCard
          title="Runway"
          value={`${runway.toFixed(1)}개월`}
          subtitle="현재 잔고 / 월평균 지출"
          tooltip="현재 잔고를 월평균 지출로 나눈 값. 추가 수입 없이 운영 가능한 개월수"
          trend={runway < 6 ? { value: Math.round(runway), isPositive: false } : undefined}
        />
        <KpiCard
          title="Net Change"
          value={fmt(latest.totalNetChangeKrw)}
          subtitle={`${latest.month} 순현금변동`}
          tooltip="Cash Inflows - Cash Outflows. 음수면 현금 순유출"
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
                  <InfoTip text={`${region.regionLabel} 법인 현금 현황`} />
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
                  <p className="text-gray-600">Inflows</p>
                  <p className="text-green-400">{fmt(region.inflowsKrw)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Outflows</p>
                  <p className="text-red-400">{fmt(region.outflowsKrw)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Net</p>
                  <p className={region.netChangeKrw >= 0 ? "text-green-400" : "text-red-400"}>
                    {fmt(region.netChangeKrw)}
                  </p>
                </div>
              </div>
              {/* 비중 바 */}
              <div className="mt-3 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E8FF47] rounded-full"
                  style={{ width: `${latest.totalBalanceKrw > 0 ? (region.balanceKrw / latest.totalBalanceKrw) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                비중 {latest.totalBalanceKrw > 0 ? ((region.balanceKrw / latest.totalBalanceKrw) * 100).toFixed(1) : 0}%
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
