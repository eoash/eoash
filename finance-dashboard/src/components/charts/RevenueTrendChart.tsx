"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { RevenueMonthly } from "@/lib/types";

interface RevenueTrendChartProps {
  data: RevenueMonthly[];
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

export default function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">월별 매출 추이</h3>
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis
              dataKey="month"
              stroke="#666"
              tick={{ fill: "#999", fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v: number) => `${v.toLocaleString()}`}
              stroke="#666"
              tick={{ fill: "#999", fontSize: 12 }}
            />
            <Tooltip content={CustomTooltip} />
            <Legend
              wrapperStyle={{ color: "#999", fontSize: 12 }}
            />
            <Bar dataKey="target" fill="#333" name="목표" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" fill="#E8FF47" name="실적" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
