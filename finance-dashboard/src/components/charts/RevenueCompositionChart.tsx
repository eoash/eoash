"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { WITHTAX_YEARLY } from "@/lib/withtax-data";

const COLORS = ["#34D399", "#47B8FF", "#A78BFA", "#F59E0B", "#FF6B6B", "#E8FF47"];

const yearly2025 = WITHTAX_YEARLY.find((y) => y.year === "2025");
const items = yearly2025?.매출항목 ?? {};
const total = Object.values(items).reduce((s, v) => s + v, 0);

const data = Object.entries(items)
  .map(([name, amount]) => ({ name, amount, ratio: ((amount / total) * 100).toFixed(1) }))
  .sort((a, b) => b.amount - a.amount);

function fmt(v: number) {
  if (Math.abs(v) >= 1e8) return `${(v / 1e8).toFixed(1)}억`;
  return `${(v / 1e4).toFixed(0)}만`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 shadow-lg">
      <p className="text-sm text-neutral-400">{entry.name}</p>
      <p className="text-sm font-bold text-white">
        {Number(entry.value).toLocaleString("ko-KR")}원
      </p>
      <p className="text-xs text-gray-500">{entry.payload.ratio}%</p>
    </div>
  );
}

export default function RevenueCompositionChart() {
  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">매출 구성</h3>
      <p className="mb-3 text-xs text-gray-500">2025년 매출 항목별 비중</p>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={105}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={CustomTooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center gap-1.5 text-xs text-gray-400">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="truncate">{item.name}</span>
            <span className="ml-auto text-gray-500 shrink-0">{item.ratio}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
