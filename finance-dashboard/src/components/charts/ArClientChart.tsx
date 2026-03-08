"use client";

import type { ArClientSummary } from "@/lib/types";
import { formatKRW } from "@/lib/utils";
import { useT } from "@/lib/contexts/LanguageContext";

const RISK_COLOR: Record<string, string> = {
  yellow: "#E8FF47",
  orange: "#F59E0B",
  red: "#EF4444",
};

const RISK_EMOJI: Record<string, string> = {
  yellow: "🟡",
  orange: "🟠",
  red: "🔴",
};

export default function ArClientChart({ data }: { data: ArClientSummary[] }) {
  const { t } = useT();
  const maxAmount = Math.max(...data.map((d) => d.totalOutstanding), 1);

  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">
        {t("ar.chart.client")} (Top {Math.min(data.length, 10)})
      </h3>
      <div className="space-y-3">
        {data.slice(0, 10).map((c) => (
          <div key={c.client}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white truncate max-w-[180px]">
                {RISK_EMOJI[c.risk]} {c.client}
              </span>
              <span className="text-sm text-gray-400 font-mono">{formatKRW(c.totalOutstanding)}</span>
            </div>
            <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(c.totalOutstanding / maxAmount) * 100}%`,
                  backgroundColor: RISK_COLOR[c.risk],
                }}
              />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-xs text-gray-600">{c.invoiceCount}{t("common.count")}</span>
              <span className="text-xs text-gray-600">{c.oldestDays}{t("common.days")}</span>
            </div>
          </div>
        ))}
      </div>
      {data.length === 0 && <p className="text-center text-gray-500 py-4">{t("ar.chart.noAr")}</p>}
    </div>
  );
}
