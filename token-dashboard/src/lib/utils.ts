import { format, subDays, parseISO } from "date-fns";

/** KST 기준 현재 시각을 반환. 서버(UTC)·클라이언트(로컬) 어디서든 KST 고정. */
export function nowKST(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utc + 9 * 60 * 60_000); // UTC+9
}

/** KST 기준 오늘 날짜 (yyyy-MM-dd) */
export function todayKST(): string {
  return format(nowKST(), "yyyy-MM-dd");
}

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

/** N일 전부터 오늘(KST)까지 날짜 범위 */
export function getDateRange(days: number): { start: string; end: string } {
  const end = nowKST();
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
