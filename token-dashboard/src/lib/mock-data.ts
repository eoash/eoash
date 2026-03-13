import type { ClaudeCodeAnalyticsResponse } from "./types";
import { UNIQUE_MEMBERS } from "./constants";

const MODELS = [
  "claude-sonnet-4-6",
  "claude-opus-4-6",
  "claude-haiku-4-5-20251001",
];

// 토큰 가중치: Sonnet 60%, Opus 25%, Haiku 15%
const MODEL_WEIGHTS = [0.6, 0.25, 0.15];

/** 멤버 수에 맞게 동적으로 가중치 생성 (지프 분포 — 상위 멤버가 더 많이 사용) */
function generateUserWeights(count: number): number[] {
  const raw = Array.from({ length: count }, (_, i) => 1 / (i + 1));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / sum);
}

/** 멤버별 수락률 (0.70~0.92 범위에서 그라데이션) */
function generateAcceptanceBase(count: number): number[] {
  return Array.from({ length: count }, (_, i) =>
    parseFloat((0.92 - (i / (count - 1)) * 0.22).toFixed(2))
  );
}

// Seeded pseudo-random for deterministic demo data
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getLast30Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function dayFactor(dateStr: string): number {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6 ? 0.4 : 1.0;
}

export function getMockAnalytics(): ClaudeCodeAnalyticsResponse {
  const dates = getLast30Days();
  const members = UNIQUE_MEMBERS;
  const userWeights = generateUserWeights(members.length);
  const acceptanceBases = generateAcceptanceBase(members.length);
  const rand = seededRandom(42);
  const data = [];

  const randomBetween = (min: number, max: number) =>
    Math.floor(rand() * (max - min + 1)) + min;

  for (const date of dates) {
    const factor = dayFactor(date);
    const isWeekend = factor < 1;

    for (let ui = 0; ui < members.length; ui++) {
      const user = members[ui];
      const userWeight = userWeights[ui];
      const acceptanceBase = acceptanceBases[ui];

      // 하위 멤버는 가끔 활동하지 않는 날이 있음 (리얼리즘)
      if (userWeight < 0.04 && rand() < 0.5) continue;

      const dailyLines = isWeekend ? 0 : randomBetween(
        Math.floor(30 * userWeight * 50),
        Math.floor(150 * userWeight * 50)
      );
      const dailyCommits = isWeekend ? 0 : randomBetween(0, Math.ceil(5 * userWeight * 30));
      const dailyPRs = isWeekend ? 0 : (rand() < userWeight * 10 ? randomBetween(0, 2) : 0);
      const dailyAcceptance = parseFloat(
        Math.min(0.98, acceptanceBase + (rand() - 0.5) * 0.1).toFixed(2)
      );

      for (let mi = 0; mi < MODELS.length; mi++) {
        const model = MODELS[mi];
        const modelWeight = MODEL_WEIGHTS[mi];
        const scale = 5_000_000 * userWeight * modelWeight * factor;

        const input_tokens = Math.floor(scale * randomBetween(70, 90) / 100);
        const output_tokens = Math.floor(scale * randomBetween(8, 15) / 100);
        const cache_read_tokens = Math.floor(scale * randomBetween(5, 15) / 100);
        const cache_creation_tokens = Math.floor(scale * randomBetween(1, 5) / 100);

        if (input_tokens === 0) continue;

        data.push({
          actor: { type: "user" as const, id: `user-${ui}`, email_address: user.email },
          model,
          date,
          session_count: randomBetween(1, Math.ceil(8 * userWeight * 30)),
          lines_of_code: mi === 0 ? dailyLines : 0,
          commits: mi === 0 ? dailyCommits : 0,
          pull_requests: mi === 0 ? dailyPRs : 0,
          tool_acceptance_rate: dailyAcceptance,
          input_tokens,
          output_tokens,
          cache_read_tokens,
          cache_creation_tokens,
        });
      }
    }
  }

  return { data };
}

/** Codex mock data (demo mode용) */
export function getMockCodexAnalytics(): { data: Array<Record<string, unknown>> } {
  const members = UNIQUE_MEMBERS.slice(0, 8); // 상위 8명만 Codex 사용
  const userWeights = generateUserWeights(members.length);
  const rand = seededRandom(123);
  const randomBetween = (min: number, max: number) =>
    Math.floor(rand() * (max - min + 1)) + min;

  const data = [];
  for (let ui = 0; ui < members.length; ui++) {
    const user = members[ui];
    const w = userWeights[ui];
    const input = Math.floor(800_000 * w * randomBetween(70, 100) / 100);
    const output = Math.floor(300_000 * w * randomBetween(60, 100) / 100);
    const cached = Math.floor(input * randomBetween(20, 50) / 100);
    const reasoning = Math.floor(output * randomBetween(5, 20) / 100);
    data.push({
      name: user.name,
      email: user.email,
      input, output, cached, reasoning,
      total: input + output + cached + reasoning,
      commits: randomBetween(2, Math.ceil(30 * w)),
      sessions: randomBetween(5, Math.ceil(50 * w)),
      pull_requests: randomBetween(0, Math.ceil(8 * w)),
    });
  }
  return { data };
}

/** Gemini mock data (demo mode용) */
export function getMockGeminiAnalytics(): { data: Array<Record<string, unknown>> } {
  const members = UNIQUE_MEMBERS.slice(0, 6); // 상위 6명만 Gemini 사용
  const userWeights = generateUserWeights(members.length);
  const rand = seededRandom(456);
  const randomBetween = (min: number, max: number) =>
    Math.floor(rand() * (max - min + 1)) + min;

  const data = [];
  for (let ui = 0; ui < members.length; ui++) {
    const user = members[ui];
    const w = userWeights[ui];
    const input = Math.floor(500_000 * w * randomBetween(60, 100) / 100);
    const output = Math.floor(200_000 * w * randomBetween(50, 100) / 100);
    const cache = Math.floor(input * randomBetween(10, 40) / 100);
    const thought = Math.floor(output * randomBetween(10, 30) / 100);
    data.push({
      name: user.name,
      email: user.email,
      input, output, cache, thought,
      total: input + output + cache + thought,
    });
  }
  return { data };
}

/** Codex DataPoint[] mock (codex-analytics API용) */
export function getMockCodexDataPoints() {
  const dates = getLast30Days();
  const members = UNIQUE_MEMBERS.slice(0, 8);
  const userWeights = generateUserWeights(members.length);
  const rand = seededRandom(789);
  const randomBetween = (min: number, max: number) =>
    Math.floor(rand() * (max - min + 1)) + min;

  const data = [];
  for (const date of dates) {
    const factor = dayFactor(date);
    if (factor < 1 && rand() < 0.6) continue;
    for (let ui = 0; ui < members.length; ui++) {
      const w = userWeights[ui];
      if (w < 0.06 && rand() < 0.4) continue;
      const scale = 800_000 * w * factor;
      const input = Math.floor(scale * randomBetween(60, 90) / 100);
      const output = Math.floor(scale * randomBetween(15, 30) / 100);
      if (input === 0) continue;
      data.push({
        actor: { type: "user" as const, id: members[ui].email, email_address: members[ui].email },
        model: rand() > 0.4 ? "gpt-5.4" : "gpt-5.3-codex",
        date,
        session_count: randomBetween(1, Math.ceil(10 * w * 10)),
        lines_of_code: randomBetween(10, Math.ceil(200 * w * 10)),
        commits: randomBetween(0, Math.ceil(5 * w * 10)),
        pull_requests: rand() < w * 5 ? randomBetween(0, 2) : 0,
        tool_acceptance_rate: 0,
        input_tokens: input,
        output_tokens: output,
        cache_read_tokens: Math.floor(input * randomBetween(15, 40) / 100),
        cache_creation_tokens: Math.floor(output * randomBetween(5, 15) / 100),
      });
    }
  }
  return data;
}

/** Gemini DataPoint[] mock (gemini-analytics API용) */
export function getMockGeminiDataPoints() {
  const dates = getLast30Days();
  const members = UNIQUE_MEMBERS.slice(0, 6);
  const userWeights = generateUserWeights(members.length);
  const geminiModels = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"];
  const rand = seededRandom(321);
  const randomBetween = (min: number, max: number) =>
    Math.floor(rand() * (max - min + 1)) + min;

  const data = [];
  for (const date of dates) {
    const factor = dayFactor(date);
    if (factor < 1 && rand() < 0.7) continue;
    for (let ui = 0; ui < members.length; ui++) {
      const w = userWeights[ui];
      if (w < 0.08 && rand() < 0.5) continue;
      const scale = 500_000 * w * factor;
      const input = Math.floor(scale * randomBetween(50, 85) / 100);
      const output = Math.floor(scale * randomBetween(10, 25) / 100);
      if (input === 0) continue;
      const model = geminiModels[Math.floor(rand() * geminiModels.length)];
      data.push({
        actor: { type: "user" as const, id: members[ui].email, email_address: members[ui].email },
        model,
        date,
        session_count: 0,
        lines_of_code: 0,
        commits: 0,
        pull_requests: 0,
        tool_acceptance_rate: 0,
        input_tokens: input,
        output_tokens: output,
        cache_read_tokens: Math.floor(input * randomBetween(10, 30) / 100),
        cache_creation_tokens: Math.floor(output * randomBetween(5, 20) / 100),
      });
    }
  }
  return data;
}
