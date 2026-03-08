"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import type { CashMonthly, CurrencyUnit } from "@/lib/types";
import { formatKRW, formatUSD, formatVND } from "@/lib/utils";
import { useT } from "@/lib/contexts/LanguageContext";

interface Props {
  monthlyData: CashMonthly[];
  currency: CurrencyUnit;
  exchangeRates: { usdKrw: number; usdVnd: number };
}

function convert(krw: number, unit: CurrencyUnit, rates: { usdKrw: number; usdVnd: number }) {
  if (unit === "KRW") return krw;
  if (unit === "USD") return rates.usdKrw > 0 ? krw / rates.usdKrw : 0;
  if (unit === "VND") return rates.usdVnd > 0 ? (krw / rates.usdKrw) * rates.usdVnd : 0;
  return krw;
}

function fmt(v: number, unit: CurrencyUnit) {
  if (unit === "KRW") return formatKRW(v);
  if (unit === "USD") return formatUSD(v);
  return formatVND(v);
}

function axisFormat(v: number, unit: CurrencyUnit) {
  if (unit === "KRW") return v >= 1e8 ? `${(v / 1e8).toFixed(0)}억` : `${(v / 1e4).toFixed(0)}만`;
  if (unit === "USD") return `$${(v / 1000).toFixed(0)}k`;
  return `${(v / 1e6).toFixed(0)}M₫`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 shadow-lg">
      <p className="mb-2 text-sm text-neutral-400">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {fmt(entry.value, currency)}
        </p>
      ))}
    </div>
  );
}

export default function CashTrendChart({ monthlyData, currency, exchangeRates }: Props) {
  const { t } = useT();
  const chartData = monthlyData.map((m) => ({
    month: m.month.replace("2026.", ""),
    inflows: convert(m.totalInflowsKrw, currency, exchangeRates),
    outflows: -convert(m.totalOutflowsKrw, currency, exchangeRates),
    net: convert(m.totalNetChangeKrw, currency, exchangeRates),
  }));

  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">{t("cash.trendChart")}</h3>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "#888", fontSize: 11 }}
              tickFormatter={(v: number) => axisFormat(Math.abs(v), currency)}
            />
            <Tooltip content={(props: any) => <CustomTooltip {...props} currency={currency} />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#888" }}
              formatter={(value: string) => <span className="text-gray-400">{value}</span>}
            />
            <ReferenceLine y={0} stroke="#333" />
            <Bar dataKey="inflows" name={t("cash.inflows")} fill="#4ADE80" radius={[4, 4, 0, 0]} />
            <Bar dataKey="outflows" name={t("cash.outflows")} fill="#F87171" radius={[0, 0, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
