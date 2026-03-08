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
import type { RevenueSegmentDetail } from "@/lib/types";

const SEGMENT_COLORS: Record<string, string> = {
  "KR 한국": "#E8FF47",
  "플래닛 한국": "#47B8FF",
  "GL 글로벌": "#34D399",
};

interface RevenueTrendChartProps {
  details: RevenueSegmentDetail[];
  months: string[];
}

function formatAxis(v: number): string {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(0)}억`;
  if (v >= 10_000_000) return `${(v / 10_000_000).toFixed(0)}천만`;
  if (v >= 10_000) return `${Math.round(v / 10_000)}만`;
  return v.toLocaleString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, e: any) => s + (Number(e.value) || 0), 0);
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 shadow-lg">
      <p className="mb-2 text-sm text-neutral-400">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value).toLocaleString("ko-KR")}원
        </p>
      ))}
      <p className="mt-1.5 pt-1.5 border-t border-neutral-700 text-sm font-semibold text-white">
        합계: {total.toLocaleString("ko-KR")}원
      </p>
    </div>
  );
}

export default function RevenueTrendChart({ details, months }: RevenueTrendChartProps) {
  // Transform segmentDetails into stacked bar data
  const segmentNames = details.map((d) => d.segment);
  const chartData = months.map((month, i) => {
    const row: Record<string, string | number> = { month };
    for (const seg of details) {
      row[seg.segment] = seg.subtotal[i] || 0;
    }
    return row;
  });

  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">사업부별 월간 매출</h3>
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis
              dataKey="month"
              stroke="#666"
              tick={{ fill: "#999", fontSize: 12 }}
            />
            <YAxis
              tickFormatter={formatAxis}
              stroke="#666"
              tick={{ fill: "#999", fontSize: 12 }}
            />
            <Tooltip content={CustomTooltip} />
            <Legend wrapperStyle={{ color: "#999", fontSize: 12 }} />
            {segmentNames.map((name) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="revenue"
                fill={SEGMENT_COLORS[name] || "#999"}
                radius={segmentNames.indexOf(name) === segmentNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
