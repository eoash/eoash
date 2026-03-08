"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ArAgingBucket } from "@/lib/types";
import { formatKRW } from "@/lib/utils";

export default function ArAgingChart({ data }: { data: ArAgingBucket[] }) {
  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">
        Aging 분포 (미수금)
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis dataKey="label" tick={{ fill: "#888", fontSize: 12 }} />
          <YAxis
            tick={{ fill: "#888", fontSize: 11 }}
            tickFormatter={(v: number) =>
              v >= 1e8 ? `${(v / 1e8).toFixed(0)}억` : v >= 1e4 ? `${(v / 1e4).toFixed(0)}만` : `${v}`
            }
          />
          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
            labelStyle={{ color: "#aaa" }}
            formatter={(value: any) => [formatKRW(value as number), "미수금"]}
          />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3 justify-center">
        {data.map((b) => (
          <div key={b.label} className="text-center">
            <span className="text-xs text-gray-500">{b.label}</span>
            <p className="text-sm font-medium text-white">{b.count}건</p>
          </div>
        ))}
      </div>
    </div>
  );
}
