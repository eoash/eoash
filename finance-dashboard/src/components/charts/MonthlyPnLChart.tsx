"use client";

import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import type { WithtaxMonthly } from "@/lib/withtax-data";
import { useT } from "@/lib/contexts/LanguageContext";

function fmt(v: number) {
  if (Math.abs(v) >= 1e8) return `${(v / 1e8).toFixed(1)}억`;
  if (Math.abs(v) >= 1e4) return `${(v / 1e4).toFixed(0)}만`;
  return v.toLocaleString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 shadow-lg">
      <p className="mb-2 text-sm text-neutral-400">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value).toLocaleString("ko-KR")}원
        </p>
      ))}
    </div>
  );
}

export default function MonthlyPnLChart({ monthly }: { monthly: WithtaxMonthly[] }) {
  const { t } = useT();
  const chartData = monthly.map((m) => ({
    month: m.month,
    매출: m.매출합계,
    판관비: m.판관비합계,
    당기순이익: m.당기순이익,
  }));
  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">{t("income.chart.monthlyPnl")}</h3>
      <p className="mb-3 text-xs text-gray-500">{t("income.chart.monthlyPnl.sub")}</p>
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="month" stroke="#666" tick={{ fill: "#999", fontSize: 12 }} />
            <YAxis
              tickFormatter={(v: number) => fmt(v)}
              stroke="#666"
              tick={{ fill: "#999", fontSize: 12 }}
            />
            <Tooltip content={CustomTooltip} />
            <Legend wrapperStyle={{ color: "#999", fontSize: 12 }} />
            <ReferenceLine y={0} stroke="#444" strokeDasharray="3 3" />
            <Bar dataKey="매출" fill="#34D399" name={t("income.chart.revenue")} radius={[4, 4, 0, 0]} />
            <Bar dataKey="판관비" fill="#FF6B6B" name={t("income.chart.expense")} radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="당기순이익"
              stroke="#00E87A"
              strokeWidth={2}
              dot={{ fill: "#00E87A", r: 3 }}
              name={t("income.chart.netIncome")}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
