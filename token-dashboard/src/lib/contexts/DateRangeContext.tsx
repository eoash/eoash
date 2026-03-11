"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { format, subDays } from "date-fns";
import { nowKST } from "@/lib/utils";

const STORAGE_KEY = "date-range-preset";

interface DateRange {
  start: string; // yyyy-MM-dd
  end: string;
  label: string;
}

interface DateRangeContextValue {
  range: DateRange;
  setRange: (range: DateRange) => void;
  days: number;
}

const today = format(nowKST(), "yyyy-MM-dd");

function buildRange(label: string): DateRange {
  const end = today;
  const kst = nowKST();
  if (label === "Today") return { start: today, end, label };
  if (label === "Last 7 days") return { start: format(subDays(kst, 6), "yyyy-MM-dd"), end, label };
  if (label === "All") return { start: format(subDays(kst, 365), "yyyy-MM-dd"), end, label };
  // default: 30 days
  return { start: format(subDays(kst, 29), "yyyy-MM-dd"), end, label: "Last 30 days" };
}

function loadSavedRange(): DateRange {
  if (typeof window === "undefined") return buildRange("Last 30 days");
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return buildRange(saved);
  return buildRange("Last 30 days");
}

const defaultRange = buildRange("Last 30 days");

const DateRangeContext = createContext<DateRangeContextValue>({
  range: defaultRange,
  setRange: () => {},
  days: 30,
});

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRangeState] = useState<DateRange>(defaultRange);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRangeState(loadSavedRange());
    setHydrated(true);
  }, []);

  const setRange = (r: DateRange) => {
    setRangeState(r);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, r.label);
    }
  };

  const days = Math.max(
    1,
    Math.round(
      (new Date(range.end).getTime() - new Date(range.start).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  // hydration 전에는 기본값으로 렌더 (SSR 불일치 방지)
  const value = hydrated ? range : defaultRange;

  return (
    <DateRangeContext.Provider value={{ range: value, setRange, days }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  return useContext(DateRangeContext);
}
