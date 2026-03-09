"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RevenueSegment } from "@/lib/types";
import type { CurrencyMode } from "@/components/revenue/RevenueDashboard";
import { useT } from "@/lib/contexts/LanguageContext";
import { BUDGET_FX_RATE } from "@/lib/utils";

interface RevenueSegmentChartProps {
  data: RevenueSegment[];
  currency: CurrencyMode;
}

const COLORS = ["#E8FF47", "#47B8FF", "#FF6B6B", "#A78BFA", "#34D399", "#F59E0B"];

export default function RevenueSegmentChart({ data, currency }: RevenueSegmentChartProps) {
  const { t } = useT();
  const rate = currency === "USD" ? BUDGET_FX_RATE : 1;
  const converted = data.map((d) => ({ ...d, amount: Math.round(d.amount / rate) }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const entry = payload[0];
    const val = Number(entry.value);
    return (
      <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 shadow-lg">
        <p className="text-sm text-neutral-400">{entry.name}</p>
        <p className="text-sm font-bold text-white">
          {currency === "USD"
            ? `$${val.toLocaleString("en-US")}`
            : `${val.toLocaleString("ko-KR")}원`}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">{t("rev.chart.segment")}</h3>
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={converted}
              dataKey="amount"
              nameKey="segment"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
            >
              {converted.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={CustomTooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {converted.map((item, index) => (
          <div key={item.segment} className="flex items-center gap-1.5 text-xs text-gray-400">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            {item.segment}
          </div>
        ))}
      </div>
    </div>
  );
}
