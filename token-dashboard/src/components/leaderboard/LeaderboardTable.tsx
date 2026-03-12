"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatTokens, formatPercent } from "@/lib/utils";
import { aggregateMembers, type ClaudeMemberRow } from "@/lib/aggregators/leaderboard";
import { NAME_TO_AVATAR } from "@/lib/constants";
import InfoTip from "@/components/InfoTip";
import DateRangePicker from "@/components/layout/DateRangePicker";
import { useT } from "@/lib/contexts/LanguageContext";
import { useDateRange } from "@/lib/contexts/DateRangeContext";
import { useTool } from "@/lib/contexts/ToolContext";
import type { TranslationKey } from "@/lib/i18n";
import type { GeminiMemberRow } from "@/app/api/gemini-usage/route";
import type { CodexMemberRow } from "@/app/api/codex-usage/route";

function navigateToMember(name: string, router: ReturnType<typeof useRouter>) {
  localStorage.setItem("members-selected", name);
  router.push("/members");
}

type AiTool = "claude" | "gemini" | "codex";
const AVATAR_COLORS = ["#7C3AED", "#DB2777", "#059669", "#D97706", "#2563EB"];
const MEDAL = ["🥇", "🥈", "🥉"];

function Avatar({ name, initial, color }: { name: string; initial: string; color: string }) {
  const avatarUrl = NAME_TO_AVATAR[name];
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: color }}>
      {initial}
    </div>
  );
}

// ── Claude Code 테이블 ──────────────────────────────
function ClaudeTable() {
  const router = useRouter();
  const { t, locale } = useT();
  const { range } = useDateRange();
  const [rows, setRows] = useState<ClaudeMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?start=${range.start}&end=${range.end}`);
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const json = await res.json();
      setRows(aggregateMembers(json.data ?? []));
      setLastUpdated(new Date().toLocaleTimeString(locale === "ko" ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (e) {
      console.warn("leaderboard fetch failed:", e);
      setError(t("common.error"));
      setRows([]);
    } finally { setLoading(false); }
  }, [range.start, range.end, t, locale]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const timer = setInterval(fetchData, 30_000);
    const onVis = () => { if (document.visibilityState === "visible") fetchData(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [fetchData]);

  const maxTotal = rows.length > 0 ? rows[0].total : 1;
  const avgTotal = rows.length > 0 ? rows.reduce((s, r) => s + r.total, 0) / rows.length : 0;
  const avgLineIndex = rows.findIndex((r) => r.total < avgTotal);

  return (
    <>
      {lastUpdated && <p className="text-xs text-neutral-600 px-6 pb-2">Updated {lastUpdated}</p>}
      {error && (
        <div className="mx-6 mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-400 text-xs">{error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e1e]">
              <th className="px-3 py-3 text-left text-xs text-neutral-600 font-medium w-10 md:px-4">#</th>
              <th className="px-3 py-3 text-left text-xs text-neutral-600 font-medium md:px-4">{t("lb.developer")}</th>
              <th className="hidden sm:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end">{t("chart.input").toUpperCase()}<InfoTip below text={t("lb.input.tip")} /></span></th>
              <th className="hidden sm:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end">{t("chart.output").toUpperCase()}<InfoTip below text={t("lb.output.tip")} /></span></th>
              <th className="hidden lg:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end">{t("chart.cacheRead").toUpperCase()}<InfoTip below text={t("lb.cacheRead.tip")} /></span></th>
              <th className="px-3 py-3 text-right text-xs text-neutral-600 font-medium min-w-[120px] md:min-w-[180px] md:px-4"><span className="inline-flex items-center justify-end">{t("lb.total")}<InfoTip below text={t("lb.total.tip")} /></span></th>
              <th className="hidden sm:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end">{t("lb.cacheHit")}<InfoTip below align="right" text={t("lb.cacheHit.tip")} /></span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral-600">{t("common.loading")}</td></tr>
            ) : rows.map((row, i) => {
              const isTop3 = i < 3;
              const isBelowAvg = row.total < avgTotal;
              const barWidth = maxTotal > 0 ? (row.total / maxTotal) * 100 : 0;
              const showAvgLine = i === avgLineIndex && avgLineIndex > 0;

              return (
                <React.Fragment key={row.name}>
                  {showAvgLine && (
                    <tr>
                      <td colSpan={7} className="px-4 py-0">
                        <div className="flex items-center gap-2 py-1">
                          <div className="flex-1 border-t border-dashed border-yellow-500/40" />
                          <span className="text-xs text-yellow-500/60 font-medium whitespace-nowrap">{t("lb.teamAvg")} — {formatTokens(avgTotal)}</span>
                          <div className="flex-1 border-t border-dashed border-yellow-500/40" />
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr onClick={() => navigateToMember(row.name, router)} className={`border-b border-[#1a1a1a] transition-colors cursor-pointer ${isTop3 ? "bg-[#00E87A]/[0.03] hover:bg-[#00E87A]/[0.07]" : "hover:bg-[#161616]"} ${isBelowAvg ? "opacity-50" : ""}`}>
                    <td className="px-3 py-3 text-sm md:px-4 md:py-4">{isTop3 ? MEDAL[i] : <span className="text-neutral-600">{i + 1}</span>}</td>
                    <td className="px-3 py-3 md:px-4 md:py-4">
                      <div className="flex items-center gap-2 md:gap-3">
                        <Avatar name={row.name} initial={row.initial} color={isTop3 ? "#00E87A" : AVATAR_COLORS[i % AVATAR_COLORS.length]} />
                        <span className={`font-medium text-sm md:text-base ${isTop3 ? "text-white" : "text-neutral-300"}`}>{row.name}</span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-4 text-right text-neutral-400 font-mono text-sm">{formatTokens(row.input)}</td>
                    <td className="hidden sm:table-cell px-4 py-4 text-right text-neutral-400 font-mono text-sm">{formatTokens(row.output)}</td>
                    <td className="hidden lg:table-cell px-4 py-4 text-right text-neutral-400 font-mono text-sm">{formatTokens(row.cacheRead)}</td>
                    <td className="px-3 py-3 text-right md:px-4 md:py-4">
                      <div className="flex items-center justify-end gap-2 md:gap-3">
                        <div className="w-16 md:w-24 h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barWidth}%`, backgroundColor: isTop3 ? "#00E87A" : isBelowAvg ? "#555" : "#888" }} />
                        </div>
                        <span className="text-white font-mono text-xs md:text-sm font-medium min-w-[50px] md:min-w-[60px] text-right">{formatTokens(row.total)}</span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-4 text-right">
                      <span className="font-mono text-sm font-bold text-[#00E87A]">{formatPercent(row.cacheHitRate)}</span>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-[#1a1a1a] flex justify-between text-xs text-neutral-600">
        <span>{rows.length}{t("lb.members")} · {range.label}</span>
        <span>{t("lb.autoRefresh")}</span>
      </div>
    </>
  );
}

// ── Codex 테이블 (실데이터) ──────────────────────────
function CodexTable() {
  const router = useRouter();
  const { t, locale } = useT();
  const { range } = useDateRange();
  const [rows, setRows] = useState<CodexMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const accentColor = "#10A37F";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/codex-usage?start=${range.start}&end=${range.end}`);
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const json = await res.json();
      setRows(json.data ?? []);
      setLastUpdated(new Date().toLocaleTimeString(locale === "ko" ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (e) {
      console.warn("codex leaderboard fetch failed:", e);
      setError(t("common.error"));
      setRows([]);
    } finally { setLoading(false); }
  }, [range.start, range.end, t, locale]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const timer = setInterval(fetchData, 30_000);
    const onVis = () => { if (document.visibilityState === "visible") fetchData(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [fetchData]);

  return (
    <>
      <div className="mx-6 mt-3 mb-2 rounded-lg border border-[#10A37F]/20 bg-[#10A37F]/5 px-4 py-2.5 text-xs text-neutral-400 leading-relaxed">
        <span className="text-[#10A37F] font-medium">Note</span> — {t("lb.codexNote" as TranslationKey)}
      </div>
      {lastUpdated && <p className="text-xs text-neutral-600 px-6 pb-2">Updated {lastUpdated}</p>}
      {error && (
        <div className="mx-6 mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-400 text-xs">{error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e1e]">
              <th className="px-3 py-3 text-left text-xs text-neutral-600 font-medium w-10 md:px-4">#</th>
              <th className="px-3 py-3 text-left text-xs text-neutral-600 font-medium md:px-4">{t("lb.developer")}</th>
              <th className="hidden sm:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end">{t("chart.input").toUpperCase()}<InfoTip below text={t("lb.input.tip")} /></span></th>
              <th className="hidden sm:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end">{t("chart.output").toUpperCase()}<InfoTip below text={t("lb.output.tip")} /></span></th>
              <th className="hidden lg:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end">CACHED<InfoTip below text={t("lb.cached.tip")} /></span></th>
              <th className="hidden lg:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end">REASONING<InfoTip below text={t("lb.reasoning.tip")} /></span></th>
              <th className="px-3 py-3 text-right text-xs text-neutral-600 font-medium md:px-4"><span className="inline-flex items-center justify-end">{t("lb.total")}<InfoTip below text={t("lb.total.tip")} /></span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral-600">{t("common.loading")}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral-600">{t("lb.noDataCodex")}</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.email} onClick={() => navigateToMember(row.name, router)} className="border-b border-[#1a1a1a] hover:bg-[#161616] transition-colors cursor-pointer">
                <td className="px-3 py-3 text-sm md:px-4 md:py-4">{i < 3 ? MEDAL[i] : <span className="text-neutral-600">{i + 1}</span>}</td>
                <td className="px-3 py-3 md:px-4 md:py-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Avatar name={row.name} initial={row.name[0]} color={AVATAR_COLORS[i % AVATAR_COLORS.length]} />
                    <span className="font-medium text-white text-sm md:text-base">{row.name}</span>
                  </div>
                </td>
                <td className="hidden sm:table-cell px-4 py-4 text-right text-neutral-400 font-mono text-sm">{formatTokens(row.input)}</td>
                <td className="hidden sm:table-cell px-4 py-4 text-right text-neutral-400 font-mono text-sm">{formatTokens(row.output)}</td>
                <td className="hidden lg:table-cell px-4 py-4 text-right text-neutral-400 font-mono text-sm">{formatTokens(row.cached)}</td>
                <td className="hidden lg:table-cell px-4 py-4 text-right text-neutral-400 font-mono text-sm">{formatTokens(row.reasoning)}</td>
                <td className="px-3 py-3 text-right md:px-4 md:py-4">
                  <span className="font-mono text-xs md:text-sm font-bold" style={{ color: accentColor }}>{formatTokens(row.total)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-[#1a1a1a] flex justify-between text-xs text-neutral-600">
        <span>{rows.length}{t("lb.members")} · {range.label}</span>
        <span>{t("lb.autoRefresh")}</span>
      </div>
    </>
  );
}

// ── Gemini CLI 테이블 (실데이터) ─────────────────────
function GeminiTable() {
  const router = useRouter();
  const { t, locale } = useT();
  const { range } = useDateRange();
  const [rows, setRows] = useState<GeminiMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const accentColor = "#4285F4";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gemini-usage?start=${range.start}&end=${range.end}`);
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const json = await res.json();
      setRows(json.data ?? []);
      setLastUpdated(new Date().toLocaleTimeString(locale === "ko" ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (e) {
      console.warn("gemini leaderboard fetch failed:", e);
      setError(t("common.error"));
      setRows([]);
    } finally { setLoading(false); }
  }, [range.start, range.end, t, locale]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const timer = setInterval(fetchData, 30_000);
    const onVis = () => { if (document.visibilityState === "visible") fetchData(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [fetchData]);

  return (
    <>
      {lastUpdated && <p className="text-xs text-neutral-600 px-6 pb-2">Updated {lastUpdated}</p>}
      {error && (
        <div className="mx-6 mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-400 text-xs">{error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e1e]">
              <th className="px-3 py-3 text-left text-xs text-neutral-600 font-medium w-10 md:px-4">#</th>
              <th className="px-3 py-3 text-left text-xs text-neutral-600 font-medium md:px-4">{t("lb.developer")}</th>
              <th className="hidden sm:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end">{t("chart.input").toUpperCase()}<InfoTip below text={t("lb.input.tip")} /></span></th>
              <th className="hidden sm:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end">{t("chart.output").toUpperCase()}<InfoTip below text={t("lb.output.tip")} /></span></th>
              <th className="hidden lg:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end">CACHE<InfoTip below text={t("lb.geminiCache.tip")} /></span></th>
              <th className="hidden lg:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end">THOUGHT<InfoTip below text={t("lb.thought.tip")} /></span></th>
              <th className="px-3 py-3 text-right text-xs text-neutral-600 font-medium md:px-4"><span className="inline-flex items-center justify-end">{t("lb.total")}<InfoTip below text={t("lb.total.tip")} /></span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral-600">{t("common.loading")}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral-600">{t("lb.noDataGemini")}</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.email} onClick={() => navigateToMember(row.name, router)} className="border-b border-[#1a1a1a] hover:bg-[#161616] transition-colors cursor-pointer">
                <td className="px-3 py-3 text-sm md:px-4 md:py-4">{i < 3 ? MEDAL[i] : <span className="text-neutral-600">{i + 1}</span>}</td>
                <td className="px-3 py-3 md:px-4 md:py-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Avatar name={row.name} initial={row.name[0]} color={AVATAR_COLORS[i % AVATAR_COLORS.length]} />
                    <span className="font-medium text-white text-sm md:text-base">{row.name}</span>
                  </div>
                </td>
                <td className="hidden sm:table-cell px-4 py-4 text-right text-neutral-400 font-mono text-sm">{formatTokens(row.input)}</td>
                <td className="hidden sm:table-cell px-4 py-4 text-right text-neutral-400 font-mono text-sm">{formatTokens(row.output)}</td>
                <td className="hidden lg:table-cell px-4 py-4 text-right text-neutral-400 font-mono text-sm">{formatTokens(row.cache)}</td>
                <td className="hidden lg:table-cell px-4 py-4 text-right text-neutral-400 font-mono text-sm">{formatTokens(row.thought)}</td>
                <td className="px-3 py-3 text-right md:px-4 md:py-4">
                  <span className="font-mono text-xs md:text-sm font-bold" style={{ color: accentColor }}>{formatTokens(row.total)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-[#1a1a1a] flex justify-between text-xs text-neutral-600">
        <span>{rows.length}{t("lb.members")} · {range.label}</span>
        <span>{t("lb.autoRefresh")}</span>
      </div>
    </>
  );
}

// ── All 통합 테이블 ──────────────────────────────────
interface AllMemberRow {
  name: string;
  claude: number;
  codex: number;
  gemini: number;
  total: number;
}

function AllTable() {
  const router = useRouter();
  const { t, locale } = useT();
  const { range } = useDateRange();
  const [rows, setRows] = useState<AllMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = `start=${range.start}&end=${range.end}`;
      const [claudeRes, codexRes, geminiRes] = await Promise.all([
        fetch(`/api/analytics?${qs}`),
        fetch(`/api/codex-usage?${qs}`),
        fetch(`/api/gemini-usage?${qs}`),
      ]);

      // Claude → aggregateMembers
      const claudeJson = await claudeRes.json();
      const claudeRows = aggregateMembers(claudeJson.data ?? []);

      // Codex / Gemini
      const codexJson = await codexRes.json();
      const geminiJson = await geminiRes.json();

      // name별로 merge
      const map = new Map<string, AllMemberRow>();
      for (const r of claudeRows) {
        const e = map.get(r.name) ?? { name: r.name, claude: 0, codex: 0, gemini: 0, total: 0 };
        e.claude += r.total;
        map.set(r.name, e);
      }
      for (const r of (codexJson.data ?? []) as CodexMemberRow[]) {
        const e = map.get(r.name) ?? { name: r.name, claude: 0, codex: 0, gemini: 0, total: 0 };
        e.codex += r.total;
        map.set(r.name, e);
      }
      for (const r of (geminiJson.data ?? []) as GeminiMemberRow[]) {
        const e = map.get(r.name) ?? { name: r.name, claude: 0, codex: 0, gemini: 0, total: 0 };
        e.gemini += r.total;
        map.set(r.name, e);
      }

      // total 계산 + 0 필터 + 정렬
      const merged = Array.from(map.values())
        .map((r) => ({ ...r, total: r.claude + r.codex + r.gemini }))
        .filter((r) => r.total > 0);
      merged.sort((a, b) => b.total - a.total);
      setRows(merged);
      setLastUpdated(new Date().toLocaleTimeString(locale === "ko" ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (e) {
      console.warn("all leaderboard fetch failed:", e);
      setError(t("common.error"));
      setRows([]);
    } finally { setLoading(false); }
  }, [range.start, range.end, t, locale]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const timer = setInterval(fetchData, 30_000);
    const onVis = () => { if (document.visibilityState === "visible") fetchData(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [fetchData]);

  const maxTotal = rows.length > 0 ? rows[0].total : 1;
  const avgTotal = rows.length > 0 ? rows.reduce((s, r) => s + r.total, 0) / rows.length : 0;
  const avgLineIndex = rows.findIndex((r) => r.total < avgTotal);

  return (
    <>
      {lastUpdated && <p className="text-xs text-neutral-600 px-6 pb-2">Updated {lastUpdated}</p>}
      {error && (
        <div className="mx-6 mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-400 text-xs">{error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e1e]">
              <th className="px-3 py-3 text-left text-xs text-neutral-600 font-medium w-10 md:px-4">#</th>
              <th className="px-3 py-3 text-left text-xs text-neutral-600 font-medium md:px-4">{t("lb.developer")}</th>
              <th className="hidden sm:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end" style={{ color: "#E8FF47" }}>CLAUDE</span></th>
              <th className="hidden sm:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end" style={{ color: "#10A37F" }}>CODEX</span></th>
              <th className="hidden sm:table-cell px-4 py-3 text-right text-xs text-neutral-600 font-medium"><span className="inline-flex items-center justify-end" style={{ color: "#4285F4" }}>GEMINI</span></th>
              <th className="px-3 py-3 text-right text-xs text-neutral-600 font-medium min-w-[120px] md:min-w-[180px] md:px-4">{t("lb.total")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-neutral-600">{t("common.loading")}</td></tr>
            ) : rows.map((row, i) => {
              const isTop3 = i < 3;
              const isBelowAvg = row.total < avgTotal;
              const showAvgLine = i === avgLineIndex && avgLineIndex > 0;
              // 스택 바: Claude/Codex/Gemini 비율
              const claudePct = maxTotal > 0 ? (row.claude / maxTotal) * 100 : 0;
              const codexPct = maxTotal > 0 ? (row.codex / maxTotal) * 100 : 0;
              const geminiPct = maxTotal > 0 ? (row.gemini / maxTotal) * 100 : 0;

              return (
                <React.Fragment key={row.name}>
                  {showAvgLine && (
                    <tr>
                      <td colSpan={6} className="px-4 py-0">
                        <div className="flex items-center gap-2 py-1">
                          <div className="flex-1 border-t border-dashed border-yellow-500/40" />
                          <span className="text-xs text-yellow-500/60 font-medium whitespace-nowrap">{t("lb.teamAvg")} — {formatTokens(avgTotal)}</span>
                          <div className="flex-1 border-t border-dashed border-yellow-500/40" />
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr onClick={() => navigateToMember(row.name, router)} className={`border-b border-[#1a1a1a] transition-colors cursor-pointer ${isTop3 ? "bg-[#00E87A]/[0.03] hover:bg-[#00E87A]/[0.07]" : "hover:bg-[#161616]"} ${isBelowAvg ? "opacity-50" : ""}`}>
                    <td className="px-3 py-3 text-sm md:px-4 md:py-4">{isTop3 ? MEDAL[i] : <span className="text-neutral-600">{i + 1}</span>}</td>
                    <td className="px-3 py-3 md:px-4 md:py-4">
                      <div className="flex items-center gap-2 md:gap-3">
                        <Avatar name={row.name} initial={row.name[0]} color={isTop3 ? "#00E87A" : AVATAR_COLORS[i % AVATAR_COLORS.length]} />
                        <span className={`font-medium text-sm md:text-base ${isTop3 ? "text-white" : "text-neutral-300"}`}>{row.name}</span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-4 text-right text-neutral-400 font-mono text-sm">{row.claude > 0 ? formatTokens(row.claude) : "—"}</td>
                    <td className="hidden sm:table-cell px-4 py-4 text-right text-neutral-400 font-mono text-sm">{row.codex > 0 ? formatTokens(row.codex) : "—"}</td>
                    <td className="hidden sm:table-cell px-4 py-4 text-right text-neutral-400 font-mono text-sm">{row.gemini > 0 ? formatTokens(row.gemini) : "—"}</td>
                    <td className="px-3 py-3 text-right md:px-4 md:py-4">
                      <div className="flex items-center justify-end gap-2 md:gap-3">
                        <div className="w-16 md:w-24 h-2 rounded-full bg-[#1a1a1a] overflow-hidden flex">
                          {claudePct > 0 && <div className="h-full transition-all duration-500" style={{ width: `${claudePct}%`, backgroundColor: "#E8FF47" }} />}
                          {codexPct > 0 && <div className="h-full transition-all duration-500" style={{ width: `${codexPct}%`, backgroundColor: "#10A37F" }} />}
                          {geminiPct > 0 && <div className="h-full transition-all duration-500" style={{ width: `${geminiPct}%`, backgroundColor: "#4285F4" }} />}
                        </div>
                        <span className="text-white font-mono text-xs md:text-sm font-medium min-w-[50px] md:min-w-[60px] text-right">{formatTokens(row.total)}</span>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-[#1a1a1a] flex justify-between text-xs text-neutral-600">
        <span>{rows.length}{t("lb.members")} · {range.label}</span>
        <span>{t("lb.autoRefresh")}</span>
      </div>
    </>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────
export default function LeaderboardTable() {
  const { tool } = useTool();

  const headerLabel = tool === "all" ? "All Tools" : tool === "claude" ? "Claude Code" : tool === "codex" ? "Codex" : "Gemini";

  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] overflow-hidden">
      <div className="px-6 py-5 flex items-center justify-between gap-4 border-b border-[#222]">
        <span className="text-sm font-medium text-neutral-400">
          {headerLabel} Leaderboard
        </span>
        <DateRangePicker />
      </div>

      {tool === "all"    && <AllTable />}
      {tool === "claude" && <ClaudeTable />}
      {tool === "gemini" && <GeminiTable />}
      {tool === "codex"  && <CodexTable />}
    </div>
  );
}
