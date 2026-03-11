import type { MemberData } from "@/lib/aggregators/team";
import type { UserProfile } from "@/lib/gamification";

export interface UsageInsight {
  id: string;
  icon: string;
  titleKo: string;
  titleEn: string;
  observationKo: string;
  observationEn: string;
  tipKo: string;
  tipEn: string;
}

/** Team-wide stats for relative comparisons */
export interface TeamStats {
  avgDailyTokens: number;
  avgCommitsPerSession: number;
  avgCacheHitRate: number;
  /** Sorted desc — totalTokens of each active member */
  allTotalTokens: number[];
  memberCount: number;
}

/** Build TeamStats from all members' aggregated data */
export function buildTeamStats(allMembers: { totalTokens: number; sessions: number; commits: number; cacheHitRate: number; daily: { date: string }[] }[]): TeamStats {
  const active = allMembers.filter((m) => m.totalTokens > 0);
  if (active.length === 0) {
    return { avgDailyTokens: 0, avgCommitsPerSession: 0, avgCacheHitRate: 0, allTotalTokens: [], memberCount: 0 };
  }

  const totalDailyTokens = active.reduce((s, m) => {
    const days = Math.max(1, m.daily.length);
    return s + m.totalTokens / days;
  }, 0);

  const totalCps = active.reduce((s, m) => s + (m.sessions > 0 ? m.commits / m.sessions : 0), 0);
  const totalChr = active.reduce((s, m) => s + m.cacheHitRate, 0);

  return {
    avgDailyTokens: totalDailyTokens / active.length,
    avgCommitsPerSession: totalCps / active.length,
    avgCacheHitRate: totalChr / active.length,
    allTotalTokens: active.map((m) => m.totalTokens).sort((a, b) => b - a),
    memberCount: active.length,
  };
}

// ── Helpers ──

function commitsPerSession(m: MemberData): number {
  return m.sessions > 0 ? m.commits / m.sessions : 0;
}

function outputInputRatio(m: MemberData): number {
  const input = m.daily.reduce((s, d) => s + d.input_tokens, 0);
  return input > 0 ? m.daily.reduce((s, d) => s + d.output_tokens, 0) / input : 0;
}

function topModel(m: MemberData): string | null {
  return m.models.length > 0 ? m.models[0].name : null;
}

function topModelShare(m: MemberData): number {
  if (m.models.length === 0 || m.totalTokens === 0) return 0;
  return m.models[0].value / m.totalTokens;
}

/** Compute trend: ratio of second-half avg to first-half avg */
function computeTrend(daily: { date: string; input_tokens: number; output_tokens: number }[]): { ratio: number; recentAvg: number; earlierAvg: number } | null {
  if (daily.length < 4) return null;
  const mid = Math.floor(daily.length / 2);
  const earlier = daily.slice(0, mid);
  const recent = daily.slice(mid);

  const earlierAvg = earlier.reduce((s, d) => s + d.input_tokens + d.output_tokens, 0) / earlier.length;
  const recentAvg = recent.reduce((s, d) => s + d.input_tokens + d.output_tokens, 0) / recent.length;

  if (earlierAvg === 0) return null;
  return { ratio: recentAvg / earlierAvg, recentAvg, earlierAvg };
}

/** Find longest consecutive streak and current streak from daily data */
function streakFromDaily(daily: { date: string }[]): { current: number; max: number } {
  if (daily.length === 0) return { current: 0, max: 0 };
  const dates = daily.map((d) => d.date).sort();
  let maxStreak = 1;
  let curStreak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
    if (diffDays === 1) {
      curStreak++;
      if (curStreak > maxStreak) maxStreak = curStreak;
    } else {
      curStreak = 1;
    }
  }
  return { current: curStreak, max: maxStreak };
}

/** Find peak day (highest total tokens) */
function peakDay(daily: { date: string; input_tokens: number; output_tokens: number }[]): { date: string; tokens: number } | null {
  if (daily.length === 0) return null;
  let best = daily[0];
  let bestTokens = best.input_tokens + best.output_tokens;
  for (const d of daily) {
    const t = d.input_tokens + d.output_tokens;
    if (t > bestTokens) { best = d; bestTokens = t; }
  }
  return { date: best.date, tokens: bestTokens };
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── Insight Generators ──
// Each generator: observation = data-driven fact, tip = actionable how-to

function frequencyInsight(profile: UserProfile, memberData: MemberData, rangeDays: number): UsageInsight | null {
  if (profile.activeDays === 0 || memberData.daily.length === 0) return null;

  const rangeSpan = Math.max(1, rangeDays);
  const activeDays = memberData.daily.length;
  const activeRatio = activeDays / rangeSpan;
  const pct = Math.round(activeRatio * 100);
  const streak = streakFromDaily(memberData.daily);

  // Almost every day (90%+)
  if (activeRatio >= 0.9) {
    return {
      id: "freq-daily",
      icon: "🔥",
      titleKo: "매일 사용하는 습관",
      titleEn: "Daily Usage Habit",
      observationKo: `${rangeSpan}일 중 ${activeDays}일 활동 (${pct}%).${streak.max >= 5 ? ` 최장 연속 ${streak.max}일.` : ""}`,
      observationEn: `Active ${activeDays} of ${rangeSpan} days (${pct}%).${streak.max >= 5 ? ` Best streak: ${streak.max}d.` : ""}`,
      tipKo: "자주 반복하는 작업이 있다면 프로젝트에 .claude/commands/작업명.md 파일을 만들어보세요. /작업명 으로 바로 실행할 수 있어 매일 쓰기가 훨씬 편해집니다.",
      tipEn: "Create .claude/commands/task-name.md files for repetitive workflows. Run them instantly with /task-name — makes daily use much smoother.",
    };
  }

  // Regular user (50-90%)
  if (activeRatio >= 0.5) {
    return {
      id: "freq-regular",
      icon: "📅",
      titleKo: "정기적 사용 패턴",
      titleEn: "Regular Usage",
      observationKo: `${rangeSpan}일 중 ${activeDays}일 활동 (${pct}%). 현재 연속 ${streak.current}일, 최장 ${streak.max}일.`,
      observationEn: `Active ${activeDays} of ${rangeSpan} days (${pct}%). Current streak: ${streak.current}d, best: ${streak.max}d.`,
      tipKo: `퇴근 전 루틴으로 claude "오늘 내가 작성한 코드 중 개선할 부분 알려줘" 를 실행해보세요. 대화를 안 열어도 터미널에서 바로 됩니다. 이렇게 하면 빈 날이 줄어들어요.`,
      tipEn: `Try a daily routine: run claude "review my recent code changes" before leaving. Works directly from terminal without opening a chat session.`,
    };
  }

  // Sporadic (<50%)
  if (activeDays >= 2) {
    return {
      id: "freq-sporadic",
      icon: "📊",
      titleKo: "간헐적 사용 패턴",
      titleEn: "Sporadic Usage",
      observationKo: `${rangeSpan}일 중 ${activeDays}일만 활동 (${pct}%).`,
      observationEn: `Active only ${activeDays} of ${rangeSpan} days (${pct}%).`,
      tipKo: "매일 Claude를 열 필요 없어요. 터미널에서 claude \"이 에러 메시지 뭔지 설명해줘\" 처럼 한 줄로 질문하는 것부터 시작해보세요. 세션을 열지 않아도 바로 답변이 옵니다.",
      tipEn: "No need to open Claude daily. Start with one-liner: claude \"explain this error message\" from your terminal. You get answers without starting a session.",
    };
  }

  return null;
}

function trendInsight(memberData: MemberData): UsageInsight | null {
  const trend = computeTrend(memberData.daily);
  if (!trend) return null;

  const peak = peakDay(memberData.daily);

  // Strong growth (>1.5x)
  if (trend.ratio >= 1.5) {
    const growthPct = Math.round((trend.ratio - 1) * 100);
    return {
      id: "trend-growing",
      icon: "📈",
      titleKo: "사용량 급증 중",
      titleEn: "Usage Surging",
      observationKo: `최근 사용량이 이전 대비 ${growthPct}% 증가. 일평균 ${fmtTokens(trend.earlierAvg)} → ${fmtTokens(trend.recentAvg)}.${peak ? ` 피크: ${fmtDate(peak.date)}` : ""}`,
      observationEn: `Recent usage up ${growthPct}%. Daily avg: ${fmtTokens(trend.earlierAvg)} → ${fmtTokens(trend.recentAvg)}.${peak ? ` Peak: ${fmtDate(peak.date)}` : ""}`,
      tipKo: "사용량이 늘 때가 CLAUDE.md를 세팅할 최적의 타이밍이에요. 프로젝트 루트에 CLAUDE.md를 만들고 기술 스택, 파일 구조, 코딩 규칙을 적어두면 매번 재설명 없이 바로 작업할 수 있습니다.",
      tipEn: "Now's the perfect time to set up CLAUDE.md. Create one in your project root with tech stack, file structure, and coding rules — Claude reads it automatically every session.",
    };
  }

  // Declining (<0.5x)
  if (trend.ratio <= 0.5 && trend.earlierAvg >= 10_000) {
    const declinePct = Math.round((1 - trend.ratio) * 100);
    return {
      id: "trend-declining",
      icon: "📉",
      titleKo: "사용량 감소 추세",
      titleEn: "Usage Declining",
      observationKo: `최근 사용량이 이전 대비 ${declinePct}% 감소. 일평균 ${fmtTokens(trend.earlierAvg)} → ${fmtTokens(trend.recentAvg)}.`,
      observationEn: `Recent usage down ${declinePct}%. Daily avg: ${fmtTokens(trend.earlierAvg)} → ${fmtTokens(trend.recentAvg)}.`,
      tipKo: "코딩 외 업무에도 AI를 써보세요: 회의록 정리, 이메일 초안, 기술 문서 작성, 코드 리뷰. claude \"이 PR 리뷰해줘\" 한 줄이면 상세한 리뷰를 받을 수 있습니다.",
      tipEn: "Use AI beyond coding: meeting notes, email drafts, tech docs, code reviews. claude \"review this PR\" gives you detailed feedback in seconds.",
    };
  }

  // Moderate growth (1.2-1.5x) with peak info
  if (trend.ratio >= 1.2 && peak) {
    return {
      id: "trend-moderate-growth",
      icon: "🌱",
      titleKo: "꾸준한 성장세",
      titleEn: "Steady Growth",
      observationKo: `사용량이 완만하게 증가 중. 일평균 ${fmtTokens(trend.earlierAvg)} → ${fmtTokens(trend.recentAvg)}. 피크: ${fmtDate(peak.date)} (${fmtTokens(peak.tokens)})`,
      observationEn: `Usage growing steadily. Daily avg: ${fmtTokens(trend.earlierAvg)} → ${fmtTokens(trend.recentAvg)}. Peak: ${fmtDate(peak.date)} (${fmtTokens(peak.tokens)})`,
      tipKo: "다음 레벨업 비법: 큰 작업을 한번에 맡겨보세요. \"이 모듈 전체를 TypeScript로 전환해줘\" 같은 파일 단위 지시를 하면 AI가 훨씬 많은 일을 해줍니다.",
      tipEn: "Level-up secret: delegate bigger tasks at once. \"Convert this entire module to TypeScript\" — file-level instructions let AI do much more.",
    };
  }

  return null;
}

function codingLeverageInsight(m: MemberData, profile: UserProfile): UsageInsight | null {
  if (m.sessions === 0) return null;

  const cps = commitsPerSession(m);

  // High commit rate
  if (cps >= 0.5 && m.commits >= 5) {
    const prRatio = m.commits > 0 ? m.pullRequests / m.commits : 0;
    if (prRatio < 0.1 && m.commits >= 10) {
      return {
        id: "code-commits-no-pr",
        icon: "🔧",
        titleKo: "커밋은 활발, PR은 부족",
        titleEn: "Active Commits, Few PRs",
        observationKo: `세션당 ${cps.toFixed(1)}커밋으로 활발하지만 PR은 ${m.pullRequests}건.`,
        observationEn: `${cps.toFixed(1)} commits/session but only ${m.pullRequests} PRs.`,
        tipKo: "작업 끝나면 /commit 치고, 이어서 \"이 변경사항으로 PR 만들어줘\" 라고 해보세요. 제목, 본문, 테스트 계획까지 자동 생성됩니다. gh pr create 도 Claude가 대신 실행해줘요.",
        tipEn: "After work, run /commit, then say \"create a PR for these changes.\" Title, body, and test plan auto-generated. Claude can run gh pr create for you.",
      };
    }
    return {
      id: "code-high-leverage",
      icon: "⚡",
      titleKo: "높은 코딩 활용도",
      titleEn: "High Coding Leverage",
      observationKo: `세션당 ${cps.toFixed(1)}커밋, PR ${m.pullRequests}건. AI를 실제 코드 작성에 잘 활용하고 있습니다.`,
      observationEn: `${cps.toFixed(1)} commits/session, ${m.pullRequests} PRs. Using AI effectively for code production.`,
      tipKo: "코드 품질을 더 올리려면: 커밋 전에 \"방금 수정한 코드에 보안 취약점이나 버그 없는지 확인해줘\" 라고 한번 물어보세요. 사소한 실수를 잡아줍니다.",
      tipEn: "Boost code quality: before committing, ask \"check my recent changes for security issues or bugs.\" Catches subtle mistakes you might miss.",
    };
  }

  // Moderate commit rate
  if (cps >= 0.1 && cps < 0.5 && m.commits >= 3) {
    const tokensPerCommit = m.totalTokens / m.commits;
    if (tokensPerCommit > 500_000) {
      return {
        id: "code-heavy-sessions",
        icon: "🔬",
        titleKo: "깊은 세션, 신중한 커밋",
        titleEn: "Deep Sessions, Careful Commits",
        observationKo: `${m.sessions}개 세션에서 ${m.commits}건 커밋. 커밋당 ${fmtTokens(tokensPerCommit)} 토큰으로 깊이 있는 작업 패턴.`,
        observationEn: `${m.commits} commits across ${m.sessions} sessions. ${fmtTokens(tokensPerCommit)} tokens/commit — deep work pattern.`,
        tipKo: "작업 중간중간 \"지금까지 한 거 커밋해줘\" 라고 하면 자동으로 변경사항을 스테이징하고 커밋합니다. 롤백도 편하고 작업 히스토리도 깔끔해져요.",
        tipEn: "Say \"commit what we have so far\" mid-session. Auto-stages and commits changes. Makes rollbacks easy and keeps your work history clean.",
      };
    }
    return {
      id: "code-moderate",
      icon: "🛠️",
      titleKo: "균형 잡힌 코딩 활용",
      titleEn: "Balanced Coding Usage",
      observationKo: `세션당 ${cps.toFixed(1)}커밋. 커밋 ${m.commits}건, PR ${m.pullRequests}건.`,
      observationEn: `${cps.toFixed(1)} commits/session. ${m.commits} commits, ${m.pullRequests} PRs.`,
      tipKo: "테스트 코드를 AI에게 맡겨보세요. \"이 함수의 엣지 케이스 포함해서 테스트 5개 작성해줘\" — 직접 쓰면 30분, AI한테 시키면 30초입니다.",
      tipEn: "Delegate test writing: \"Write 5 tests including edge cases for this function\" — 30 seconds instead of 30 minutes.",
    };
  }

  // Low commit rate (consultation style)
  if (cps < 0.1 && m.sessions >= 5) {
    return {
      id: "code-consultation",
      icon: "💬",
      titleKo: "상담형 사용 패턴",
      titleEn: "Consultation Pattern",
      observationKo: `${m.sessions}개 세션에서 커밋 ${m.commits}건. 주로 질문·상담 용도로 사용 중.`,
      observationEn: `${m.commits} commits in ${m.sessions} sessions. Mostly using for Q&A and consultation.`,
      tipKo: "다음에 코드 수정이 필요할 때 \"이 파일 직접 수정해줘\" 라고 해보세요. Claude가 파일을 직접 열어서 고칩니다. 설명만 받는 것보다 훨씬 빠르고, 바로 커밋까지 가능합니다.",
      tipEn: "Next time you need a code change, say \"edit this file directly.\" Claude opens and modifies it for you — much faster than just getting explanations, and you can commit right away.",
    };
  }

  return null;
}

function modelStrategyInsight(m: MemberData): UsageInsight | null {
  if (m.models.length === 0) return null;

  const top = topModel(m);
  const share = topModelShare(m);

  // Single model user (>90% one model)
  if (share > 0.9 && m.models.length <= 2) {
    const isOpus = top?.toLowerCase().includes("opus");
    const isSonnet = top?.toLowerCase().includes("sonnet");
    const isHaiku = top?.toLowerCase().includes("haiku");
    const sharePct = Math.round(share * 100);

    if (isOpus) {
      return {
        id: "model-opus-only",
        icon: "🧠",
        titleKo: "Opus 집중 사용",
        titleEn: "Opus-Focused",
        observationKo: `${top} ${sharePct}% 사용. 강력하지만 응답 속도가 느린 모델에 집중하고 있습니다.`,
        observationEn: `${top} at ${sharePct}%. Focused on the most powerful but slower model.`,
        tipKo: "간단한 수정이나 질문은 터미널에서 claude --model sonnet \"OOO 해줘\" 로 해보세요. Sonnet은 Opus보다 2-3배 빠르고 간단한 작업에는 품질 차이가 거의 없습니다.",
        tipEn: "For simple fixes, try claude --model sonnet \"do X\". Sonnet is 2-3x faster than Opus with nearly identical quality for straightforward tasks.",
      };
    }

    if (isHaiku) {
      return {
        id: "model-haiku-only",
        icon: "🏃",
        titleKo: "Haiku 집중 사용",
        titleEn: "Haiku-Focused",
        observationKo: `${top} ${sharePct}% 사용. 빠르지만 복잡한 작업에는 한계가 있는 모델입니다.`,
        observationEn: `${top} at ${sharePct}%. Fast but limited for complex tasks.`,
        tipKo: "복잡한 버그 디버깅이나 아키텍처 설계가 필요하면 /model sonnet 또는 /model opus 로 전환해보세요. Haiku가 못 푸는 문제를 Sonnet이 한번에 해결하는 경우가 많습니다.",
        tipEn: "For complex debugging or architecture, switch with /model sonnet or /model opus. Sonnet often solves in one shot what Haiku can't handle.",
      };
    }

    if (isSonnet) {
      return {
        id: "model-sonnet-balanced",
        icon: "⚖️",
        titleKo: "Sonnet 균형 사용",
        titleEn: "Sonnet-Balanced",
        observationKo: `${top} ${sharePct}% 사용. 속도와 품질의 균형이 잘 잡힌 모델입니다.`,
        observationEn: `${top} at ${sharePct}%. Good balance of speed and quality.`,
        tipKo: "대규모 리팩토링이나 복잡한 시스템 설계를 할 때는 /model opus 로 전환해보세요. Opus는 여러 파일에 걸친 큰 변경을 더 정확하게 계획하고 실행합니다.",
        tipEn: "For large refactoring or complex system design, try /model opus. Opus plans and executes multi-file changes more accurately.",
      };
    }
  }

  // Multi-model user
  if (m.models.length >= 3) {
    const modelNames = m.models.slice(0, 3).map((mod) => mod.name).join(", ");
    return {
      id: "model-diverse",
      icon: "🎨",
      titleKo: "다양한 모델 활용",
      titleEn: "Diverse Model Usage",
      observationKo: `${m.models.length}개 모델 사용 (${modelNames}). 작업에 따라 모델을 전환하는 고급 패턴.`,
      observationEn: `${m.models.length} models (${modelNames}). Advanced pattern of switching by task.`,
      tipKo: "모델 전환의 고수! 한 단계 더: .claude/settings.json에 defaultModel을 설정하고, 필요할 때만 /model로 전환하면 더 효율적입니다. 또한 Codex CLI나 Gemini CLI도 병행하면 각 도구의 강점을 비교할 수 있어요.",
      tipEn: "Model-switching pro! Set defaultModel in .claude/settings.json, switch with /model only when needed. Also try Codex CLI or Gemini CLI to compare tool strengths.",
    };
  }

  return null;
}

function cacheInsight(m: MemberData): UsageInsight | null {
  if (m.totalTokens === 0) return null;

  const rate = m.cacheHitRate;

  if (rate >= 0.7) {
    return {
      id: "cache-high",
      icon: "♻️",
      titleKo: "높은 캐시 효율",
      titleEn: "High Cache Efficiency",
      observationKo: `캐시 적중률 ${Math.round(rate * 100)}%. CLAUDE.md나 프로젝트 컨텍스트가 잘 설계되어 있다는 의미입니다.`,
      observationEn: `${Math.round(rate * 100)}% cache hit rate. Your CLAUDE.md and project context are well-designed.`,
      tipKo: "캐시 효율이 좋다는 건 Claude가 프로젝트를 잘 이해하고 있다는 뜻이에요. 자주 하는 워크플로우가 있다면 .claude/commands/ 폴더에 커스텀 명령어로 만들어서 더 자동화해보세요.",
      tipEn: "High cache = Claude understands your project well. If you have frequent workflows, create custom commands in .claude/commands/ for further automation.",
    };
  }

  if (rate < 0.3 && m.sessions >= 5) {
    return {
      id: "cache-low",
      icon: "📝",
      titleKo: "낮은 캐시 적중률",
      titleEn: "Low Cache Hit Rate",
      observationKo: `캐시 적중률 ${Math.round(rate * 100)}%. 매번 새로운 컨텍스트를 전송하고 있어 비효율적입니다.`,
      observationEn: `${Math.round(rate * 100)}% cache hit rate. Sending fresh context each time — inefficient.`,
      tipKo: "프로젝트 루트에 CLAUDE.md 파일을 만들고 기술 스택, 파일 구조, 코딩 규칙을 적어두세요. Claude가 매 세션마다 자동으로 읽어서 캐시하므로 응답이 빨라지고 토큰도 절약됩니다.",
      tipEn: "Create CLAUDE.md in your project root with tech stack, file structure, and coding rules. Claude reads it automatically each session — faster responses, fewer tokens.",
    };
  }

  return null;
}

function volumeInsight(m: MemberData, profile: UserProfile): UsageInsight | null {
  if (profile.activeDays === 0) return null;

  const dailyAvg = m.totalTokens / profile.activeDays;
  const oir = outputInputRatio(m);
  const peak = peakDay(m.daily);

  // Very light user
  if (dailyAvg < 10_000 && profile.activeDays >= 3) {
    return {
      id: "vol-light",
      icon: "🌱",
      titleKo: "가벼운 사용량",
      titleEn: "Light Usage",
      observationKo: `일 평균 ${fmtTokens(dailyAvg)} 토큰. 짧은 질문 위주로 사용하고 있습니다.`,
      observationEn: `${fmtTokens(dailyAvg)} tokens/day avg. Mostly short queries.`,
      tipKo: "Claude에게 더 큰 일을 시켜보세요: \"이 파일 전체를 읽고 버그 있으면 고쳐줘\", \"이 폴더의 모든 TODO 코멘트를 찾아서 정리해줘\". 한 번에 큰 작업을 맡길수록 생산성이 올라갑니다.",
      tipEn: "Give Claude bigger tasks: \"Read this entire file and fix any bugs\", \"Find and organize all TODO comments in this folder.\" Bigger tasks = bigger productivity gains.",
    };
  }

  // High output ratio (generating lots of code)
  if (oir >= 2.0 && m.totalTokens >= 100_000) {
    return {
      id: "vol-high-output",
      icon: "🚀",
      titleKo: "높은 코드 생성률",
      titleEn: "High Code Generation",
      observationKo: `출력/입력 비율 ${oir.toFixed(1)}x. 적은 프롬프트로 많은 코드를 생성하고 있습니다.${peak ? ` 피크: ${fmtDate(peak.date)} (${fmtTokens(peak.tokens)})` : ""}`,
      observationEn: `${oir.toFixed(1)}x output/input ratio.${peak ? ` Peak: ${fmtDate(peak.date)} (${fmtTokens(peak.tokens)})` : ""}`,
      tipKo: "코드 생성 효율이 높아요! 다음 단계: 생성된 코드를 바로 커밋하지 말고 \"방금 작성한 코드 리뷰해줘\" 라고 한번 더 물어보세요. 2차 검수로 품질이 올라갑니다.",
      tipEn: "Great generation efficiency! Next step: before committing, ask \"review the code you just wrote.\" This second pass catches subtle issues and improves quality.",
    };
  }

  // Power user
  if (dailyAvg >= 500_000 && m.totalTokens >= 1_000_000) {
    const formattedAvg = fmtTokens(dailyAvg);
    return {
      id: "vol-power-user",
      icon: "⚡",
      titleKo: "파워 유저",
      titleEn: "Power User",
      observationKo: `일 평균 ${formattedAvg} 토큰.${peak ? ` 피크: ${fmtDate(peak.date)} (${fmtTokens(peak.tokens)})` : ""}`,
      observationEn: `${formattedAvg} tokens/day avg.${peak ? ` Peak: ${fmtDate(peak.date)} (${fmtTokens(peak.tokens)})` : ""}`,
      tipKo: "파워 유저에게 추천: .claude/commands/ 에 자주 하는 작업을 커스텀 슬래시 명령어로 만들어보세요. 예를 들어 /deploy, /test-all, /daily-review 같은 나만의 워크플로우를 한 명령어로 실행할 수 있습니다.",
      tipEn: "Power user pro tip: create custom slash commands in .claude/commands/ for frequent workflows — /deploy, /test-all, /daily-review — run entire workflows with one command.",
    };
  }

  // Moderate user
  if (dailyAvg >= 10_000 && dailyAvg < 500_000) {
    const formattedAvg = fmtTokens(dailyAvg);
    return {
      id: "vol-moderate",
      icon: "📈",
      titleKo: "안정적인 사용 패턴",
      titleEn: "Steady Usage",
      observationKo: `일 평균 ${formattedAvg} 토큰.${peak ? ` 피크: ${fmtDate(peak.date)} (${fmtTokens(peak.tokens)})` : ""}`,
      observationEn: `${formattedAvg} tokens/day avg.${peak ? ` Peak: ${fmtDate(peak.date)} (${fmtTokens(peak.tokens)})` : ""}`,
      tipKo: "사용량을 늘리는 가장 쉬운 방법: 단순 질문 대신 파일 단위로 작업을 맡겨보세요. \"이 모듈 전체 타입을 정리해줘\", \"이 API에 에러 핸들링 추가해줘\" 같은 구체적 지시가 효과적입니다.",
      tipEn: "Easiest way to boost productivity: delegate file-level tasks. \"Clean up all types in this module\" or \"add error handling to this API\" — specific instructions are most effective.",
    };
  }

  return null;
}

// ── Main Export ──

export function generateUsageInsights(
  memberData: MemberData,
  profile: UserProfile | null,
  rangeDays: number = 30,
  team: TeamStats | null = null,
): UsageInsight[] {
  if (!profile || profile.totalTokens === 0 || profile.activeDays === 0) return [];

  // Generate all possible insights (6 generators)
  const insights: (UsageInsight | null)[] = [
    frequencyInsight(profile, memberData, rangeDays),
    trendInsight(memberData),
    codingLeverageInsight(memberData, profile),
    modelStrategyInsight(memberData),
    cacheInsight(memberData),
    volumeInsight(memberData, profile),
  ];

  const valid = insights.filter((i): i is UsageInsight => i !== null);

  // Prioritize: trend > frequency > coding > model > cache > volume
  // (trend is most differentiating since it's based on actual data changes)
  const trendIdx = valid.findIndex((i) => i.id.startsWith("trend-"));
  if (trendIdx > 1) {
    const [trend] = valid.splice(trendIdx, 1);
    valid.splice(1, 0, trend);
  }

  return valid.slice(0, 3);
}
