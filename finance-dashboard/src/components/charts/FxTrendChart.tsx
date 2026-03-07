"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { FxHistoryPoint } from "@/lib/types";

interface FxTrendChartProps {
  data: FxHistoryPoint[];
  pair: "usdKrw" | "usdVnd";
  title: string;
  color: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 shadow-lg">
      <p className="mb-1 text-sm text-neutral-400">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm font-bold" style={{ color: entry.color }}>
          {Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export default function FxTrendChart({ data, pair, title, color }: FxTrendChartProps) {
  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis
              dataKey="date"
              stroke="#666"
              tick={{ fill: "#999", fontSize: 12 }}
            />
            <YAxis
              domain={["auto", "auto"]}
              stroke="#666"
              tick={{ fill: "#999", fontSize: 12 }}
              tickFormatter={(v: number) => v.toLocaleString()}
            />
            <Tooltip content={CustomTooltip} />
            <Legend wrapperStyle={{ color: "#999", fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey={pair}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 3 }}
              activeDot={{ r: 5 }}
              name={title}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
