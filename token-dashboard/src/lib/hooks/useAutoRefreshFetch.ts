"use client";

import { useState, useEffect, useCallback } from "react";
import { useDateRange } from "@/lib/contexts/DateRangeContext";
import { useT } from "@/lib/contexts/LanguageContext";

interface UseAutoRefreshFetchResult<T> {
  rows: T[];
  loading: boolean;
  error: string | null;
  lastUpdated: string;
}

/**
 * Auto-refresh fetch hook — 30초 interval + visibilitychange 자동 재조회.
 *
 * @param url - API 엔드포인트 (DateRange query string이 자동 추가됨)
 * @param transform - API 응답 json을 row 배열로 변환하는 함수
 * @param intervalMs - 자동 갱신 간격 (기본 30초)
 */
export function useAutoRefreshFetch<T>(
  url: string,
  transform: (json: Record<string, unknown>) => T[],
  intervalMs = 30_000,
): UseAutoRefreshFetchResult<T> {
  const { range } = useDateRange();
  const { t, locale } = useT();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sep = url.includes("?") ? "&" : "?";
      const res = await fetch(`${url}${sep}start=${range.start}&end=${range.end}`);
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const json = await res.json();
      setRows(transform(json));
      setLastUpdated(
        new Date().toLocaleTimeString(locale === "ko" ? "ko-KR" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    } catch (e) {
      console.warn(`${url} fetch failed:`, e);
      setError(t("common.error"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [url, range.start, range.end, t, locale, transform]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const timer = setInterval(fetchData, intervalMs);
    const onVis = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchData, intervalMs]);

  return { rows, loading, error, lastUpdated };
}
