"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { YoYRow } from "@/lib/types";
import { formatKRW } from "@/lib/utils";
import { useT } from "@/lib/contexts/LanguageContext";

const COLORS = ["#333", "#444", "#555", "#666", "#00E87A", "#4ADE80"];

export default function YoYChart({ data }: { data: YoYRow[] }) {
  const { t } = useT();
  // 월별 비교 차트 데이터
  const months = Array.from({ length: 12 }, (_, i) => t(`month.${i + 1}` as any));
  const chartData = months.map((m, i) => {
    const row: Record<string, any> = { month: m };
    for (const d of data) row[d.year] = d.monthly[i];
    return row;
  });

  // 최근 3년만 표시
  const recentYears = data.slice(-3);

  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">{t("yoy.chart.monthly")}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} />
            <YAxis
              tick={{ fill: "#888", fontSize: 11 }}
              tickFormatter={(v: number) => v >= 1e8 ? `${(v / 1e8).toFixed(0)}억` : `${(v / 1e4).toFixed(0)}만`}
            />
            <Tooltip
              contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
              labelStyle={{ color: "#aaa" }}
              formatter={(value: any, name: any) => [formatKRW(value as number), name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-gray-400">{v}</span>} />
            {recentYears.map((d, i) => (
              <Bar key={d.year} dataKey={d.year} fill={COLORS[COLORS.length - recentYears.length + i]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
