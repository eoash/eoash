"use client";

import { useState, useEffect, useMemo } from "react";
import KpiCard from "@/components/cards/KpiCard";
import DailyUsageChart from "@/components/charts/DailyUsageChart";
import ModelPieChart from "@/components/charts/ModelPieChart";
import UsageInsightCard from "@/components/members/UsageInsightCard";
import DateRangePicker from "@/components/layout/DateRangePicker";
import { UNIQUE_MEMBERS } from "@/lib/constants";
import { formatTokens, formatPercent } from "@/lib/utils";
import { useAnalytics } from "@/lib/hooks/useAnalytics";
import { aggregateMember } from "@/lib/aggregators/team";
import { buildProfiles } from "@/lib/gamification";
import { generateUsageInsights } from "@/lib/usage-insights";
import { useT } from "@/lib/contexts/LanguageContext";
import { useDateRange } from "@/lib/contexts/DateRangeContext";

export default function TeamPage() {
  const { t } = useT();
  const { days } = useDateRange();
  const [selectedName, setSelectedName] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("members-selected");
      if (saved && UNIQUE_MEMBERS.some((m) => m.name === saved)) return saved;
    }
    return UNIQUE_MEMBERS[0]?.name ?? "";
  });
  const { data: rawData, loading, error } = useAnalytics();

  useEffect(() => {
    localStorage.setItem("members-selected", selectedName);
  }, [selectedName]);

  const memberData = aggregateMember(rawData, selectedName);

  // Build profiles once, find selected member's profile
  const profiles = useMemo(() => buildProfiles(rawData), [rawData]);
  const selectedProfile = useMemo(
    () => profiles.find((p) => p.name === selectedName) ?? null,
    [profiles, selectedName],
  );

  const insights = useMemo(
    () => generateUsageInsights(memberData, selectedProfile, days),
    [memberData, selectedProfile, days],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">{t("nav.members")}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangePicker />
          <select
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
            className="bg-[#111111] border border-[#333] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00E87A]"
          >
            {UNIQUE_MEMBERS.map((m) => (
              <option key={m.name} value={m.name}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-gray-400 text-center py-12">{t("common.loading")}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard title={t("kpi.totalTokens")} value={formatTokens(memberData.totalTokens)} tooltip={t("team.tokens.tip")} />
            <KpiCard title={t("kpi.cacheHitRate")} value={formatPercent(memberData.cacheHitRate)} tooltip={t("team.cacheHit.tip")} />
            <KpiCard title={t("team.sessions")} value={String(memberData.sessions)} tooltip={t("team.sessions.tip")} />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <KpiCard title={t("kpi.totalCommits")} value={String(memberData.commits)} subtitle={`by ${selectedName}`} tooltip={t("team.commits.tip")} />
            <KpiCard title={t("kpi.pullRequests")} value={String(memberData.pullRequests)} subtitle={`by ${selectedName}`} tooltip={t("team.prs.tip")} />
          </div>

          <UsageInsightCard insights={insights} name={selectedName} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DailyUsageChart data={memberData.daily} />
            </div>
            <div>
              <ModelPieChart data={memberData.models} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
