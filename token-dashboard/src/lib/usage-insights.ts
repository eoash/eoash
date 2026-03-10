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

// ── Insight Generators ──

function frequencyInsight(profile: UserProfile, memberData: MemberData, rangeDays: number): UsageInsight | null {
  if (profile.activeDays === 0 || memberData.daily.length === 0) return null;

  // Use the user-selected date range (not data-derived span) for accurate ratio
  const rangeSpan = Math.max(1, rangeDays);
  const activeDays = memberData.daily.length;
  const activeRatio = activeDays / rangeSpan;
  const pct = Math.round(activeRatio * 100);

  // Almost every day (90%+)
  if (activeRatio >= 0.9) {
    return {
      id: "freq-daily",
      icon: "🔥",
      titleKo: "매일 사용하는 습관",
      titleEn: "Daily Usage Habit",
      observationKo: `선택 기간 ${rangeSpan}일 중 ${activeDays}일 활동 (${pct}%). 거의 매일 AI를 활용하고 있습니다.`,
      observationEn: `Active ${activeDays} of ${rangeSpan} days (${pct}%). Using AI almost every day.`,
      tipKo: "꾸준함이 최고의 학습 전략입니다. 다음 도전: 다양한 모델을 실험해보세요. Sonnet은 빠른 작업에, Opus는 복잡한 설계에 최적화되어 있습니다.",
      tipEn: "Consistency is the best learning strategy. Next challenge: experiment with different models. Sonnet for quick tasks, Opus for complex design.",
    };
  }

  // Regular user (50-90%)
  if (activeRatio >= 0.5) {
    return {
      id: "freq-regular",
      icon: "📅",
      titleKo: "정기적 사용 패턴",
      titleEn: "Regular Usage",
      observationKo: `선택 기간 ${rangeSpan}일 중 ${activeDays}일 활동 (${pct}%). 주중 대부분 AI를 사용하고 있습니다.`,
      observationEn: `Active ${activeDays} of ${rangeSpan} days (${pct}%). Using AI most working days.`,
      tipKo: "좋은 사용 빈도입니다! 빈 날에도 짧은 세션을 열어보세요. 코드 리뷰나 문서 정리 같은 가벼운 작업부터 시작하면 매일 사용하는 습관이 잡힙니다.",
      tipEn: "Good frequency! Try opening short sessions on off-days too. Start with light tasks like code reviews or documentation — it builds daily habits.",
    };
  }

  // Sporadic (<50%)
  if (activeDays >= 3) {
    return {
      id: "freq-sporadic",
      icon: "📊",
      titleKo: "간헐적 사용 패턴",
      titleEn: "Sporadic Usage",
      observationKo: `선택 기간 ${rangeSpan}일 중 ${activeDays}일만 활동 (${pct}%). 사용 빈도가 낮은 편입니다.`,
      observationEn: `Active only ${activeDays} of ${rangeSpan} days (${pct}%). Low usage frequency.`,
      tipKo: "매일 5분이라도 AI와 대화하는 습관을 만들어보세요. 아침에 코드 리뷰를 맡기거나, 퇴근 전 오늘 작성한 코드의 개선점을 물어보는 것부터 시작하면 좋습니다.",
      tipEn: "Try using AI for just 5 minutes daily. Start by requesting a morning code review or asking for improvements on today's code before leaving.",
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
        observationKo: `세션당 ${cps.toFixed(1)}커밋으로 코드 생성을 잘 활용하고 있지만, PR은 ${m.pullRequests}건으로 적은 편입니다.`,
        observationEn: `${cps.toFixed(1)} commits/session shows good code generation, but only ${m.pullRequests} PRs.`,
        tipKo: "커밋을 PR로 묶어 팀에 공유해보세요. Claude에게 \"이 변경사항들로 PR 설명 작성해줘\"라고 하면 PR 제목·본문·테스트 계획까지 자동 생성됩니다.",
        tipEn: "Bundle commits into PRs to share with your team. Ask Claude to \"write a PR description for these changes\" — it auto-generates title, body, and test plan.",
      };
    }
    return {
      id: "code-high-leverage",
      icon: "⚡",
      titleKo: "높은 코딩 활용도",
      titleEn: "High Coding Leverage",
      observationKo: `세션당 ${cps.toFixed(1)}커밋, 총 ${m.pullRequests}건의 PR을 생성했습니다. AI를 실제 코드 작성에 효과적으로 활용하고 있습니다.`,
      observationEn: `${cps.toFixed(1)} commits/session with ${m.pullRequests} PRs. Effectively using AI for actual code production.`,
      tipKo: "다음 단계: /commit 명령어로 커밋 메시지 자동 생성, /review-pr로 PR 리뷰를 AI에게 맡겨보세요. 코드 품질과 속도를 동시에 높일 수 있습니다.",
      tipEn: "Next level: Use /commit for auto commit messages and /review-pr for AI code reviews. Boost both quality and speed.",
    };
  }

  // Moderate commit rate (using AI for mixed work)
  if (cps >= 0.1 && cps < 0.5 && m.commits >= 3) {
    const tokensPerCommit = m.totalTokens / m.commits;
    if (tokensPerCommit > 500_000) {
      return {
        id: "code-heavy-sessions",
        icon: "🔬",
        titleKo: "깊은 세션, 신중한 커밋",
        titleEn: "Deep Sessions, Careful Commits",
        observationKo: `${m.sessions}개 세션에서 ${m.commits}건 커밋 — 커밋당 ${Math.round(tokensPerCommit / 1000).toLocaleString()}K 토큰을 사용하고 있습니다. 깊이 있는 작업 후 커밋하는 패턴입니다.`,
        observationEn: `${m.commits} commits across ${m.sessions} sessions — ${Math.round(tokensPerCommit / 1000).toLocaleString()}K tokens per commit. Deep work before committing.`,
        tipKo: "세션 중간중간 작은 단위로 커밋하면 작업 이력 추적이 쉬워집니다. Claude에게 \"지금까지 변경사항을 커밋해줘\"라고 수시로 요청해보세요. 롤백도 편해지고, PR 리뷰도 수월해집니다.",
        tipEn: "Try committing in smaller increments during sessions. Ask Claude to \"commit changes so far\" periodically. Makes rollbacks easier and PR reviews smoother.",
      };
    }
    return {
      id: "code-moderate",
      icon: "🛠️",
      titleKo: "균형 잡힌 코딩 활용",
      titleEn: "Balanced Coding Usage",
      observationKo: `세션당 ${cps.toFixed(1)}커밋으로 AI를 코딩에 적절히 활용하고 있습니다. 커밋 ${m.commits}건, PR ${m.pullRequests}건.`,
      observationEn: `${cps.toFixed(1)} commits/session — balanced AI coding usage. ${m.commits} commits, ${m.pullRequests} PRs.`,
      tipKo: "한 단계 더: 테스트 코드 작성을 AI에게 맡겨보세요. \"이 함수의 엣지 케이스 테스트 5개 작성해줘\"처럼 구체적으로 지시하면 커밋 품질이 올라갑니다.",
      tipEn: "Level up: delegate test writing to AI. \"Write 5 edge case tests for this function\" — specific instructions improve commit quality.",
    };
  }

  // Low commit rate (using AI mostly for chat/consultation)
  if (cps < 0.1 && m.sessions >= 5) {
    return {
      id: "code-consultation",
      icon: "💬",
      titleKo: "상담형 사용 패턴",
      titleEn: "Consultation Pattern",
      observationKo: `${m.sessions}개 세션에서 커밋 ${m.commits}건 — 주로 질문·리뷰·디버깅 상담으로 AI를 활용하고 있습니다.`,
      observationEn: `${m.commits} commits across ${m.sessions} sessions — primarily using AI for Q&A, reviews, and debugging consultation.`,
      tipKo: "상담도 좋지만, 직접 코드 수정까지 맡겨보면 생산성이 크게 올라갑니다. \"이 함수를 리팩토링해줘\", \"테스트 코드 작성해줘\" 같은 구체적 지시를 해보세요. Claude가 파일을 직접 수정합니다.",
      tipEn: "Consultation is great, but delegating code changes boosts productivity significantly. Try specific instructions like \"refactor this function\" or \"write tests for this.\" Claude edits files directly.",
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

    if (isOpus) {
      return {
        id: "model-opus-only",
        icon: "🧠",
        titleKo: "Opus 집중 사용",
        titleEn: "Opus-Focused",
        observationKo: `${top}을 ${Math.round(share * 100)}% 사용 중. 고성능 모델에 집중하고 있습니다.`,
        observationEn: `Using ${top} for ${Math.round(share * 100)}% of work. Focused on the high-performance model.`,
        tipKo: "Opus는 복잡한 설계·아키텍처에 최적이지만, 간단한 작업에는 Sonnet이 더 빠르고 효율적입니다. 설정에서 모델을 전환하며 작업 난이도에 맞게 사용해보세요.",
        tipEn: "Opus excels at complex design, but Sonnet is faster for simple tasks. Try switching models based on task complexity.",
      };
    }

    if (isHaiku) {
      return {
        id: "model-haiku-only",
        icon: "🏃",
        titleKo: "Haiku 집중 사용",
        titleEn: "Haiku-Focused",
        observationKo: `${top}을 ${Math.round(share * 100)}% 사용 중. 빠르고 가벼운 모델 위주입니다.`,
        observationEn: `Using ${top} for ${Math.round(share * 100)}% of work. Focused on the fast, lightweight model.`,
        tipKo: "Haiku는 간단한 질문에 빠르지만, 복잡한 코드 생성이나 디버깅에는 Sonnet/Opus가 훨씬 정확합니다. 작업이 복잡해지면 모델을 올려보세요 — 결과 품질 차이가 큽니다.",
        tipEn: "Haiku is fast for simple queries, but Sonnet/Opus are far more accurate for complex code generation. Upgrade when tasks get complex — quality difference is significant.",
      };
    }

    if (isSonnet) {
      return {
        id: "model-sonnet-balanced",
        icon: "⚖️",
        titleKo: "Sonnet 균형 사용",
        titleEn: "Sonnet-Balanced",
        observationKo: `${top}을 ${Math.round(share * 100)}% 사용 중. 속도와 품질의 균형을 잘 잡고 있습니다.`,
        observationEn: `Using ${top} for ${Math.round(share * 100)}% of work. Good balance of speed and quality.`,
        tipKo: "Sonnet은 좋은 기본 선택입니다. 아키텍처 설계나 복잡한 리팩토링 시에는 Opus로 전환하면 더 깊은 분석을 받을 수 있습니다. /model opus 같은 명령으로 전환해보세요.",
        tipEn: "Sonnet is a solid default. For architecture design or complex refactoring, switch to Opus for deeper analysis. Try /model opus to switch.",
      };
    }
  }

  // Multi-model user
  if (m.models.length >= 3) {
    return {
      id: "model-diverse",
      icon: "🎨",
      titleKo: "다양한 모델 활용",
      titleEn: "Diverse Model Usage",
      observationKo: `${m.models.length}개 모델을 사용 중. 작업 유형에 따라 모델을 전환하는 고급 패턴입니다.`,
      observationEn: `Using ${m.models.length} models. Advanced pattern of switching models by task type.`,
      tipKo: "모델 다양성은 AI 네이티브의 핵심 역량입니다! Codex(OpenAI)나 Gemini CLI도 함께 사용해보면 각 도구의 강점을 비교할 수 있습니다.",
      tipEn: "Model diversity is a key AI-native skill! Try Codex (OpenAI) or Gemini CLI to compare each tool's strengths.",
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
      observationKo: `캐시 적중률 ${Math.round(rate * 100)}%로 프롬프트 재활용이 매우 효율적입니다.`,
      observationEn: `${Math.round(rate * 100)}% cache hit rate — very efficient prompt reuse.`,
      tipKo: "CLAUDE.md, 스킬 파일 등 반복 컨텍스트가 잘 설계되어 있다는 의미입니다. 이 패턴을 유지하면서, 새로운 스킬을 만들어 자주 쓰는 워크플로우를 자동화해보세요.",
      tipEn: "This means your CLAUDE.md and skills are well-designed. Maintain this pattern and create new skills to automate frequent workflows.",
    };
  }

  if (rate < 0.3 && m.sessions >= 5) {
    return {
      id: "cache-low",
      icon: "📝",
      titleKo: "낮은 캐시 적중률",
      titleEn: "Low Cache Hit Rate",
      observationKo: `캐시 적중률이 ${Math.round(rate * 100)}%로 매번 새로운 컨텍스트를 보내고 있습니다.`,
      observationEn: `${Math.round(rate * 100)}% cache hit rate — sending fresh context each time.`,
      tipKo: "CLAUDE.md 파일에 프로젝트 구조·코딩 규칙·자주 쓰는 패턴을 정리해두면 매 세션마다 재설명할 필요가 없어집니다. 캐시 적중률이 올라가면 응답도 빨라지고 비용도 절약됩니다.",
      tipEn: "Document project structure, coding rules, and common patterns in CLAUDE.md. This eliminates re-explaining each session, speeds up responses, and saves costs.",
    };
  }

  return null;
}

function volumeInsight(m: MemberData, profile: UserProfile): UsageInsight | null {
  if (profile.activeDays === 0) return null;

  const dailyAvg = m.totalTokens / profile.activeDays;
  const oir = outputInputRatio(m);

  // Very light user
  if (dailyAvg < 10_000 && profile.activeDays >= 3) {
    return {
      id: "vol-light",
      icon: "🌱",
      titleKo: "가벼운 사용량",
      titleEn: "Light Usage",
      observationKo: `일 평균 ${Math.round(dailyAvg).toLocaleString()} 토큰으로 간단한 질문 위주로 사용하고 있습니다.`,
      observationEn: `${Math.round(dailyAvg).toLocaleString()} tokens/day average — mostly simple queries.`,
      tipKo: "AI에게 더 긴 작업을 맡겨보세요. \"이 파일 전체를 리팩토링해줘\", \"테스트 코드 10개 작성해줘\" 같은 대규모 지시를 하면 토큰 사용량이 늘면서 생산성도 크게 올라갑니다.",
      tipEn: "Try delegating longer tasks. \"Refactor this entire file\" or \"Write 10 test cases\" — larger instructions increase both usage and productivity.",
    };
  }

  // High output ratio (generating lots of code)
  if (oir >= 2.0 && m.totalTokens >= 100_000) {
    return {
      id: "vol-high-output",
      icon: "🚀",
      titleKo: "높은 코드 생성률",
      titleEn: "High Code Generation",
      observationKo: `출력/입력 비율 ${oir.toFixed(1)}x — 적은 프롬프트로 많은 코드를 생성하고 있습니다.`,
      observationEn: `${oir.toFixed(1)}x output/input ratio — generating lots of code from concise prompts.`,
      tipKo: "프롬프트 효율이 매우 좋습니다! 생성된 코드의 품질을 높이려면 CLAUDE.md에 코딩 스타일 가이드를 추가하거나, \"이 코드를 리뷰하고 개선점을 알려줘\"로 2차 검수를 해보세요.",
      tipEn: "Excellent prompt efficiency! To improve generated code quality, add a coding style guide to CLAUDE.md or ask Claude to review and improve the generated code.",
    };
  }

  // Heavy user with good daily volume
  if (dailyAvg >= 500_000 && m.totalTokens >= 1_000_000) {
    const formattedAvg = dailyAvg >= 1_000_000
      ? `${(dailyAvg / 1_000_000).toFixed(1)}M`
      : `${Math.round(dailyAvg / 1000)}K`;
    return {
      id: "vol-power-user",
      icon: "⚡",
      titleKo: "파워 유저",
      titleEn: "Power User",
      observationKo: `일 평균 ${formattedAvg} 토큰을 사용하는 헤비 유저입니다. AI를 업무의 핵심 도구로 활용하고 있습니다.`,
      observationEn: `${formattedAvg} tokens/day average — a heavy user leveraging AI as a core work tool.`,
      tipKo: "사용량이 많은 만큼, 커스텀 스킬(/skills)을 만들어 반복 작업을 자동화하면 효율이 더 올라갑니다. 자주 하는 작업 패턴을 스킬로 정리해보세요.",
      tipEn: "With this volume, creating custom skills (/skills) to automate repetitive tasks will further boost efficiency. Package your frequent workflows into skills.",
    };
  }

  // Moderate user
  if (dailyAvg >= 10_000 && dailyAvg < 500_000) {
    const formattedAvg = `${Math.round(dailyAvg / 1000)}K`;
    return {
      id: "vol-moderate",
      icon: "📈",
      titleKo: "성장하는 사용 패턴",
      titleEn: "Growing Usage",
      observationKo: `일 평균 ${formattedAvg} 토큰 — AI 활용이 안정적으로 자리잡고 있습니다.`,
      observationEn: `${formattedAvg} tokens/day average — AI usage is becoming established.`,
      tipKo: "사용량을 더 끌어올리려면 단순 질문 대신 파일 단위 작업을 맡겨보세요. \"이 모듈의 타입을 전부 정리해줘\", \"이 API에 에러 핸들링 추가해줘\" 같은 구체적 지시가 효과적입니다.",
      tipEn: "To boost usage, delegate file-level tasks instead of simple questions. Specific instructions like \"add error handling to this API\" or \"clean up all types in this module\" are most effective.",
    };
  }

  return null;
}

// ── Main Export ──

export function generateUsageInsights(
  memberData: MemberData,
  profile: UserProfile | null,
  rangeDays: number = 30,
): UsageInsight[] {
  // No insights for users with no data or no profile
  if (!profile || profile.totalTokens === 0 || profile.activeDays === 0) return [];

  const insights: (UsageInsight | null)[] = [
    frequencyInsight(profile, memberData, rangeDays),
    codingLeverageInsight(memberData, profile),
    modelStrategyInsight(memberData),
    cacheInsight(memberData),
    volumeInsight(memberData, profile),
  ];

  // Max 3 insights to avoid overwhelming users
  return insights.filter((i): i is UsageInsight => i !== null).slice(0, 3);
}
