"use client";

import type { UsageInsight } from "@/lib/usage-insights";
import { useT } from "@/lib/contexts/LanguageContext";

interface Props {
  insights: UsageInsight[];
  name: string;
}

export default function UsageInsightCard({ insights, name }: Props) {
  const { locale } = useT();

  if (insights.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-[#222] bg-[#0D0D0D] p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[#00E87A] font-mono text-xs tracking-wider">[LOG]</span>
        <span className="text-gray-400 font-mono text-xs">
          {locale === "ko"
            ? `${name}의 AI 사용 패턴 분석`
            : `AI Usage Pattern Analysis for ${name}`}
        </span>
      </div>

      <div className="space-y-4">
        {insights.map((insight) => (
          <div key={insight.id} className="group">
            {/* Observation */}
            <div className="flex items-start gap-2 mb-1.5">
              <span className="text-lg leading-6 shrink-0">{insight.icon}</span>
              <div>
                <span className="text-white text-sm font-medium">
                  {locale === "ko" ? insight.titleKo : insight.titleEn}
                </span>
                <p className="text-gray-400 text-sm mt-0.5">
                  {locale === "ko" ? insight.observationKo : insight.observationEn}
                </p>
              </div>
            </div>

            {/* Tip */}
            <div className="ml-7 mt-1.5 rounded-lg bg-[#00E87A]/5 border border-[#00E87A]/10 px-3 py-2">
              <span className="text-[#00E87A] text-xs font-mono mr-1.5">TIP</span>
              <span className="text-gray-300 text-sm">
                {locale === "ko" ? insight.tipKo : insight.tipEn}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
