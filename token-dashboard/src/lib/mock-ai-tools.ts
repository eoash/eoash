export interface AiMemberRow {
  name: string;
  initial: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  avgDailySessions: number;
  acceptanceRate?: number; // Claude Code 전용
}

export function getMockGeminiData(): AiMemberRow[] {
  return [
    { name: "Jay",     initial: "J", inputTokens: 4_210_000, outputTokens: 630_000, totalTokens: 4_840_000, avgDailySessions: 12 },
    { name: "Seohyun", initial: "S", inputTokens: 3_800_000, outputTokens: 720_000, totalTokens: 4_520_000, avgDailySessions:  9 },
    { name: "Alex",    initial: "A", inputTokens: 2_650_000, outputTokens: 410_000, totalTokens: 3_060_000, avgDailySessions:  7 },
    { name: "Yuna",    initial: "Y", inputTokens: 2_940_000, outputTokens: 380_000, totalTokens: 3_320_000, avgDailySessions:  5 },
    { name: "Chris",   initial: "C", inputTokens: 1_480_000, outputTokens: 210_000, totalTokens: 1_690_000, avgDailySessions:  3 },
  ];
}

