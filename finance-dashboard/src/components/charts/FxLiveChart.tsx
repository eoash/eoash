"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatNumber } from "@/lib/utils";

interface FxPoint {
  date: string;
  rate: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 shadow-lg">
      <p className="mb-1 text-xs text-neutral-400">{label}</p>
      <p className="text-sm font-bold text-white">
        {formatNumber(Math.round(payload[0].value))}원
      </p>
    </div>
  );
}

export default function FxLiveChart({ data }: { data: FxPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-[#111111] border border-[#222] p-6 text-center">
        <p className="text-gray-500">환율 추이 데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date.slice(5), // "MM-DD"
    rate: d.rate,
  }));

  const rates = data.map((d) => d.rate);
  const avg = rates.reduce((s, r) => s + r, 0) / rates.length;

  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">USD/KRW 90일 추이</h3>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <defs>
              <linearGradient id="fxGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E8FF47" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#E8FF47" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#888", fontSize: 11 }}
              interval={Math.floor(chartData.length / 8)}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "#888", fontSize: 11 }}
              tickFormatter={(v: number) => `${formatNumber(v)}`}
            />
            <Tooltip content={CustomTooltip} />
            <ReferenceLine
              y={avg}
              stroke="#666"
              strokeDasharray="4 4"
              label={{ value: `평균 ${Math.round(avg)}`, fill: "#666", fontSize: 10, position: "right" }}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="#E8FF47"
              strokeWidth={2}
              fill="url(#fxGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#E8FF47" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
