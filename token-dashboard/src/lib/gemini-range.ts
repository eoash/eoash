import { tsToDate } from "./prometheus";

export interface GeminiQueryRange {
  /** Prometheus query start (1일 패딩 포함, ISO string) */
  start: string;
  /** Prometheus query end (ISO string) */
  end: string;
  /** 실제 데이터 시작일 (YYYY-MM-DD, computeDailyIncrease의 startDate 파라미터) */
  actualStartDate: string;
}

/**
 * Gemini Prometheus rolling window 계산.
 * Prometheus는 "now 기준 N일 전"만 조회 가능하므로,
 * 사용자가 선택한 (startDate, endDate)를 rolling window로 변환.
 *
 * - 1일 패딩: 첫 데이터포인트의 baseline 확보 (delta 계산용)
 * - endDay > now 이면 now로 클램프
 */
export function computeGeminiRange(startDate: string, endDate: string): GeminiQueryRange {
  const now = new Date();
  const endDay = endDate ? new Date(`${endDate}T23:59:59Z`) : now;
  const end = (endDay > now ? now : endDay).toISOString();

  const startDay = startDate
    ? new Date(`${startDate}T00:00:00Z`)
    : new Date(now.getTime() - 365 * 86400000);
  const daysDiff = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / 86400000));
  const rollingStart = new Date(now.getTime() - daysDiff * 86400 * 1000);
  const paddedStart = new Date(rollingStart.getTime() - 86400 * 1000);
  const start = paddedStart.toISOString();
  const actualStartDate = tsToDate(Math.floor(rollingStart.getTime() / 1000));

  return { start, end, actualStartDate };
}
