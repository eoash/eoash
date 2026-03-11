"use client";

import { format, subDays } from "date-fns";
import { useDateRange } from "@/lib/contexts/DateRangeContext";
import { useT } from "@/lib/contexts/LanguageContext";
import { nowKST, todayKST } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n";

const today = todayKST();

const PRESETS: { labelKey: TranslationKey; days: number; persistLabel: string }[] = [
  { labelKey: "date.today", days: 0, persistLabel: "Today" },
  { labelKey: "date.7d", days: 6, persistLabel: "Last 7 days" },
  { labelKey: "date.30d", days: 29, persistLabel: "Last 30 days" },
  { labelKey: "date.all", days: 365, persistLabel: "All" },
];

export default function DateRangePicker() {
  const { range, setRange } = useDateRange();
  const { t } = useT();

  const applyPreset = (days: number, persistLabel: string) => {
    setRange({
      start: days === 0 ? today : format(subDays(nowKST(), days), "yyyy-MM-dd"),
      end: today,
      label: persistLabel,
    });
  };

  const isPresetActive = (days: number) => {
    const expected = days === 0 ? today : format(subDays(nowKST(), days), "yyyy-MM-dd");
    return range.start === expected && range.end === today;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] p-0.5 gap-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => applyPreset(p.days, p.persistLabel)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              isPresetActive(p.days)
                ? "bg-[#00E87A] text-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {t(p.labelKey)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={range.start}
          max={range.end}
          onChange={(e) => setRange({ start: e.target.value, end: range.end, label: "Custom" })}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-[#00E87A] [color-scheme:dark]"
        />
        <span className="text-xs text-gray-600">~</span>
        <input
          type="date"
          value={range.end}
          min={range.start}
          max={today}
          onChange={(e) => setRange({ start: range.start, end: e.target.value, label: "Custom" })}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-[#00E87A] [color-scheme:dark]"
        />
      </div>
      <span className="text-xs text-gray-500">{range.label}</span>
    </div>
  );
}
