"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import type { UserProfile } from "@/lib/gamification";
import { useT } from "@/lib/contexts/LanguageContext";
import { useMemo } from "react";

interface Props {
  profile: UserProfile;
  allProfiles: UserProfile[];
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export default function RadarComparison({ profile, allProfiles }: Props) {
  const { locale } = useT();
  const isKo = locale === "ko";

  const { chartData, stats } = useMemo(() => {
    const teamAvg = {
      tokens: avg(allProfiles.map((p) => p.totalTokens)),
      activeDays: avg(allProfiles.map((p) => p.activeDays)),
      commits: avg(allProfiles.map((p) => p.totalCommits)),
      streak: avg(allProfiles.map((p) => p.currentStreak)),
      achievements: avg(allProfiles.map((p) => p.earnedAchievements.length)),
    };

    const maxVals = {
      tokens: Math.max(...allProfiles.map((p) => p.totalTokens)) || 1,
      activeDays: Math.max(...allProfiles.map((p) => p.activeDays)) || 1,
      commits: Math.max(...allProfiles.map((p) => p.totalCommits)) || 1,
      streak: Math.max(...allProfiles.map((p) => p.currentStreak)) || 1,
      achievements:
        Math.max(...allProfiles.map((p) => p.earnedAchievements.length)) || 1,
    };

    const axes: {
      key: keyof typeof teamAvg;
      labelKo: string;
      labelEn: string;
      userVal: number;
      unit?: string;
    }[] = [
      { key: "tokens", labelKo: "토큰", labelEn: "Tokens", userVal: profile.totalTokens },
      { key: "activeDays", labelKo: "활동일", labelEn: "Active", userVal: profile.activeDays, unit: isKo ? "일" : "d" },
      { key: "commits", labelKo: "커밋", labelEn: "Commits", userVal: profile.totalCommits },
      { key: "streak", labelKo: "스트릭", labelEn: "Streak", userVal: profile.currentStreak, unit: isKo ? "일" : "d" },
      { key: "achievements", labelKo: "업적", labelEn: "Achieve", userVal: profile.earnedAchievements.length },
    ];

    const statsArr: { label: string; userVal: number; avgVal: number; above: boolean; unit?: string }[] = [];

    const data = axes.map((axis) => {
      const userRatio = axis.userVal / maxVals[axis.key];
      const avgRatio = teamAvg[axis.key] / maxVals[axis.key];
      // sqrt 스케일: 상위권 압축, 중하위권 확대 → 비교가 수월해짐
      const userNorm = Math.sqrt(userRatio) * 100;
      const avgNorm = Math.sqrt(avgRatio) * 100;
      const above = axis.userVal > teamAvg[axis.key];
      statsArr.push({
        label: isKo ? axis.labelKo : axis.labelEn,
        userVal: axis.userVal,
        avgVal: teamAvg[axis.key],
        above,
        unit: axis.unit,
      });
      return {
        axis: isKo ? axis.labelKo : axis.labelEn,
        user: Math.round(userNorm),
        avg: Math.round(avgNorm),
      };
    });

    return { chartData: data, stats: statsArr };
  }, [profile, allProfiles, isKo]);

  const userColor = profile.level.color[0];
  const aboveCount = stats.filter((s) => s.above).length;

  return (
    <div className="rounded-xl border border-[#222] bg-[#111111] p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-white">
          {isKo ? "🛰️ 탐사 프로필" : "🛰️ Exploration Profile"}
        </h2>
        {/* Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: userColor, opacity: 0.7 }}
            />
            <span className="text-xs text-gray-500">
              {isKo ? "나" : "You"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full border border-dashed"
              style={{ borderColor: "#555", backgroundColor: "transparent" }}
            />
            <span className="text-xs text-gray-500">
              {isKo ? "팀 평균" : "Avg"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ width: "100%", height: 270 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="#1a1a1a" strokeWidth={1} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#555", fontSize: 11, fontWeight: 500 }}
            />
            <Radar
              name="Team Avg"
              dataKey="avg"
              stroke="#444"
              fill="#444"
              fillOpacity={0.08}
              strokeDasharray="4 3"
              strokeWidth={1.5}
            />
            <Radar
              name={profile.name}
              dataKey="user"
              stroke={userColor}
              fill={userColor}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Stat comparison row */}
      <div className="grid grid-cols-5 gap-1 mt-1">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-xs text-gray-600 mb-0.5">{s.label}</p>
            <p className="text-xs font-medium" style={{ color: s.above ? userColor : "#666" }}>
              {formatCompact(s.userVal)}{s.unit ?? ""}
            </p>
            <p className="text-xs text-gray-600">
              {isKo ? "평균 " : "avg "}{formatCompact(s.avgVal)}{s.unit ?? ""}
            </p>
          </div>
        ))}
      </div>

      <p
        className="text-xs text-gray-600 mt-3 font-mono"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        [LOG] {aboveCount === 5
          ? (isKo ? "전 영역 팀 평균 초과. 최전선 탐사 중." : "All dimensions above average. Leading exploration.")
          : aboveCount === 0
            ? (isKo ? "전 영역 팀 평균 이하. 탐사 가속 필요." : "All dimensions below average. Acceleration needed.")
            : (isKo
              ? `${stats.filter(s => s.above).map(s => s.label).join("·")} 팀 평균 초과 (${aboveCount}/5).`
              : `Above avg in ${stats.filter(s => s.above).map(s => s.label).join(", ")} (${aboveCount}/5).`
            )
        }
      </p>
    </div>
  );
}
