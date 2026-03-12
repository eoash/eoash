"use client";

import { useMemo } from "react";
import Link from "next/link";
import { NAME_TO_AVATAR } from "@/lib/constants";
import { formatTokens } from "@/lib/utils";
import type { ClaudeCodeDataPoint } from "@/lib/types";
import { resolveActorName } from "@/lib/constants";
import { startOfWeek, format, parseISO } from "date-fns";
import { useT } from "@/lib/contexts/LanguageContext";
import { buildProfiles } from "@/lib/gamification";

interface WeeklyChampion {
  week: string;
  weekLabel: string;
  name: string;
  tokens: number;
  avatar?: string;
}

function isCodexModel(model: string): boolean {
  return model.startsWith("gpt-") || model.toLowerCase().includes("codex");
}

function computeChampions(data: ClaudeCodeDataPoint[], filter: (model: string) => boolean): WeeklyChampion[] {
  const weekUserMap = new Map<string, Map<string, number>>();

  for (const d of data) {
    if (!d.date || !d.model) continue;
    if (!filter(d.model)) continue;
    const weekStart = startOfWeek(parseISO(d.date), { weekStartsOn: 1 });
    const weekKey = format(weekStart, "yyyy-MM-dd");
    const name = resolveActorName(d.actor);
    const tokens = d.input_tokens + d.output_tokens;

    if (!weekUserMap.has(weekKey)) weekUserMap.set(weekKey, new Map());
    const userMap = weekUserMap.get(weekKey)!;
    userMap.set(name, (userMap.get(name) ?? 0) + tokens);
  }

  const champions: WeeklyChampion[] = [];
  for (const [weekKey, userMap] of weekUserMap) {
    let topName = "";
    let topTokens = 0;
    for (const [name, tokens] of userMap) {
      if (tokens > topTokens) {
        topName = name;
        topTokens = tokens;
      }
    }
    if (topName && topTokens > 0) {
      const ws = parseISO(weekKey);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      champions.push({
        week: weekKey,
        weekLabel: `${format(ws, "M/d")} ~ ${format(we, "M/d")}`,
        name: topName,
        tokens: topTokens,
        avatar: NAME_TO_AVATAR[topName],
      });
    }
  }

  return champions.sort((a, b) => b.week.localeCompare(a.week));
}

function ChampionRow({ c, i, accentColor, levelMap }: {
  c: WeeklyChampion;
  i: number;
  accentColor: string;
  levelMap: Map<string, { level: number; icon: string }>;
}) {
  const isTop = i === 0;
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
        isTop ? `border` : "bg-white/[0.02]"
      }`}
      style={isTop ? { backgroundColor: `${accentColor}08`, borderColor: `${accentColor}33` } : undefined}
    >
      <span className="text-xs font-mono w-24 flex-shrink-0" style={{ color: isTop ? accentColor : undefined }}>
        {!isTop && <span className="text-gray-500">{c.weekLabel}</span>}
        {isTop && c.weekLabel}
      </span>
      {c.avatar ? (
        <img src={c.avatar} alt={c.name} className="w-6 h-6 rounded-full flex-shrink-0" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
          {c.name[0]}
        </div>
      )}
      <span className={`text-sm font-medium flex-1 ${isTop ? "text-white" : "text-gray-300"}`}>
        {levelMap.get(c.name) && (
          <span className="text-xs text-gray-500 mr-1">
            {levelMap.get(c.name)!.icon}Lv.{levelMap.get(c.name)!.level}
          </span>
        )}
        {c.name}
      </span>
      <span className="text-xs font-mono" style={{ color: isTop ? accentColor : undefined }}>
        {!isTop && <span className="text-gray-500">{formatTokens(c.tokens)}</span>}
        {isTop && formatTokens(c.tokens)}
      </span>
    </div>
  );
}

export default function WeeklyChampions({ data }: { data: ClaudeCodeDataPoint[] }) {
  const { t, locale } = useT();
  const claudeChampions = useMemo(() => computeChampions(data, (m) => !isCodexModel(m)), [data]);
  const codexChampions = useMemo(() => computeChampions(data, isCodexModel), [data]);
  const profiles = useMemo(() => buildProfiles(data), [data]);
  const levelMap = useMemo(() => {
    const map = new Map<string, { level: number; icon: string }>();
    for (const p of profiles) map.set(p.name, { level: p.level.level, icon: p.level.icon });
    return map;
  }, [profiles]);

  if (claudeChampions.length === 0 && codexChampions.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#222] bg-[#111111] p-5">
      {/* Claude 주간 챔피언 */}
      {claudeChampions.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            {t("weekly.title")}
            <span className="text-[10px] font-normal text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">Claude</span>
          </h2>
          <div className="space-y-2">
            {claudeChampions.map((c, i) => (
              <ChampionRow key={c.week} c={c} i={i} accentColor="#00E87A" levelMap={levelMap} />
            ))}
          </div>
        </>
      )}

      {/* Codex 주간 챔피언 */}
      {codexChampions.length > 0 && (
        <>
          <h2 className={`text-sm font-semibold text-white mb-3 flex items-center gap-2 ${claudeChampions.length > 0 ? "mt-5" : ""}`}>
            {t("weekly.title")}
            <span className="text-[10px] font-normal text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">Codex</span>
          </h2>
          <div className="space-y-2">
            {codexChampions.map((c, i) => (
              <ChampionRow key={c.week} c={c} i={i} accentColor="#10A37F" levelMap={levelMap} />
            ))}
          </div>
        </>
      )}

      <Link
        href="/rank"
        className="mt-3 block text-center text-xs text-gray-500 hover:text-[#00E87A] transition-colors"
      >
        📡 {locale === "ko" ? "Explorer's Log →" : "Explorer's Log →"}
      </Link>
    </div>
  );
}
