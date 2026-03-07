import { format, subDays, parseISO } from "date-fns";

/** 토큰 수를 읽기 쉽게 포맷 (1234567 → "1.23M") */
export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

/** 날짜 포맷 (MM/dd) */
export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "MM/dd");
}

/** 날짜 포맷 (yyyy-MM-dd) */
export function formatDateFull(dateStr: string): string {
  return format(parseISO(dateStr), "yyyy-MM-dd");
}

/** N일 전부터 오늘까지 날짜 범위 */
export function getDateRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = subDays(end, days);
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
}

/** 숫자를 쉼표로 포맷 */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** 퍼센트 포맷 */
export function formatPercent(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

/** 캐시 히트율 계산 (공통) */
export function calcCacheHitRate(cacheRead: number, cacheCreation: number, input: number): number {
  const denom = cacheRead + cacheCreation + input;
  return denom > 0 ? cacheRead / denom : 0;
}

/** 출력 비율 계산 */
export function calcOutputRatio(output: number, input: number): number {
  return input > 0 ? output / input : 0;
}

/** 캐시 효율 계산 (cache_read / cache_creation) */
export function calcCacheEfficiency(cacheRead: number, cacheCreation: number): number {
  return cacheCreation > 0 ? cacheRead / cacheCreation : 0;
}
