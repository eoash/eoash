# RPG Gamification Implementation Plan

**Goal:** token-dashboard에 /rank 페이지 신설 — 레벨, XP, 칭호, 업적 배지 RPG 시스템

**Architecture:** 기존 API 데이터(`/api/analytics`)에서 클라이언트 사이드로 XP/레벨/업적 계산. 새 DB나 API 불필요. `gamification.ts` 엔진이 핵심, 나머지는 UI 컴포넌트.

**Tech Stack:** Next.js 16 + TypeScript + Tailwind v4 (기존 스택 그대로)

**Design Doc:** `docs/plans/2026-03-09-rank-gamification-design.md`

---

### Task 1: 게이미피케이션 엔진 — 상수 & 타입

**Files:**
- Create: `token-dashboard/src/lib/gamification.ts`

**Step 1: 레벨/업적 상수 & 타입 정의**

```typescript
// === Types ===
export interface LevelInfo {
  level: number;
  requiredXp: number;
  titleKo: string;
  titleEn: string;
  icon: string;
}

export interface Achievement {
  id: string;
  name: string;
  category: "onboarding" | "streak" | "volume" | "cumulative" | "multi" | "champion" | "time" | "milestone";
  icon: string;
  conditionKo: string;
  conditionEn: string;
}

export interface UserProfile {
  email: string;
  name: string;
  avatar?: string;
  xp: number;
  level: LevelInfo;
  nextLevel: LevelInfo | null;
  xpInLevel: number;      // current level 내 진행 XP
  xpToNext: number;        // 다음 레벨까지 필요 XP
  progressPercent: number;  // XP bar %
  totalTokens: number;
  activeDays: number;
  totalCommits: number;
  totalPRs: number;
  currentStreak: number;
  maxStreak: number;
  earnedAchievements: string[];  // achievement ids
  tools: Set<string>;       // "claude" | "codex" | "gemini"
  models: Set<string>;      // model names used
}

// === Level Table ===
export const LEVELS: LevelInfo[] = [
  { level: 1, requiredXp: 0,       titleKo: "코드 새싹",   titleEn: "Code Sprout",  icon: "🌱" },
  { level: 2, requiredXp: 50,      titleKo: "견습 코더",   titleEn: "Apprentice",   icon: "⚡" },
  { level: 3, requiredXp: 200,     titleKo: "코드 기사",   titleEn: "Code Knight",  icon: "⚔️" },
  { level: 4, requiredXp: 1_000,   titleKo: "마법 개발자", titleEn: "Arcane Dev",   icon: "🔮" },
  { level: 5, requiredXp: 5_000,   titleKo: "코드 마법사", titleEn: "Code Wizard",  icon: "🧙" },
  { level: 6, requiredXp: 25_000,  titleKo: "대마법사",    titleEn: "Archmage",     icon: "🌟" },
  { level: 7, requiredXp: 80_000,  titleKo: "전설의 코더", titleEn: "Legendary",    icon: "👑" },
  { level: 8, requiredXp: 200_000, titleKo: "AI 네이티브", titleEn: "AI Native",    icon: "🐉" },
];

// === Achievements (38) ===
export const ACHIEVEMENTS: Achievement[] = [
  // Onboarding (4)
  { id: "first-light",     name: "First Light",        category: "onboarding", icon: "🌅", conditionKo: "첫 토큰 사용",          conditionEn: "First token usage" },
  { id: "first-commit",    name: "First Commit",       category: "onboarding", icon: "📝", conditionKo: "AI로 첫 커밋",          conditionEn: "First AI commit" },
  { id: "first-pr",        name: "First PR",           category: "onboarding", icon: "🔀", conditionKo: "AI로 첫 PR",            conditionEn: "First AI PR" },
  { id: "level-up",        name: "Level Up!",          category: "onboarding", icon: "🎓", conditionKo: "Lv.2 달성",             conditionEn: "Reach Lv.2" },

  // Streak (13)
  { id: "streak-2",        name: "Spark",              category: "streak",     icon: "🕯️", conditionKo: "2일 연속 사용",          conditionEn: "2 consecutive days" },
  { id: "streak-3",        name: "On Fire",            category: "streak",     icon: "🔥", conditionKo: "3일 연속 사용",          conditionEn: "3 consecutive days" },
  { id: "streak-5",        name: "Blazing",            category: "streak",     icon: "🔥🔥", conditionKo: "5일 연속 사용",        conditionEn: "5 consecutive days" },
  { id: "streak-7",        name: "Unstoppable",        category: "streak",     icon: "☄️", conditionKo: "7일 연속 사용",          conditionEn: "7 consecutive days" },
  { id: "streak-14",       name: "Two Weeks Strong",   category: "streak",     icon: "🌟", conditionKo: "14일 연속 사용",         conditionEn: "14 consecutive days" },
  { id: "streak-30",       name: "Diamond Streak",     category: "streak",     icon: "💎", conditionKo: "30일 연속 사용",         conditionEn: "30 consecutive days" },
  { id: "streak-60",       name: "Iron Will",          category: "streak",     icon: "🏔️", conditionKo: "60일 연속 사용",         conditionEn: "60 consecutive days" },
  { id: "streak-100",      name: "Eternal Flame",      category: "streak",     icon: "🐉", conditionKo: "100일 연속 사용",        conditionEn: "100 consecutive days" },
  { id: "streak-150",      name: "Alchemist",          category: "streak",     icon: "⚗️", conditionKo: "150일 연속 사용",        conditionEn: "150 consecutive days" },
  { id: "streak-200",      name: "Monolith",           category: "streak",     icon: "🗿", conditionKo: "200일 연속 사용",        conditionEn: "200 consecutive days" },
  { id: "streak-365",      name: "Event Horizon",      category: "streak",     icon: "🌌", conditionKo: "365일 연속 사용",        conditionEn: "365 consecutive days" },
  { id: "streak-500",      name: "Immortal",           category: "streak",     icon: "🪬", conditionKo: "500일 연속 사용",        conditionEn: "500 consecutive days" },
  { id: "streak-1000",     name: "Millennium",         category: "streak",     icon: "🏆∞", conditionKo: "1000일 연속 사용",      conditionEn: "1000 consecutive days" },

  // Volume (5)
  { id: "vol-100k",        name: "Chatty",             category: "volume",     icon: "💬", conditionKo: "일일 output 100K",       conditionEn: "Daily output 100K" },
  { id: "vol-1m",          name: "Token Flood",        category: "volume",     icon: "🌊", conditionKo: "일일 output 1M",         conditionEn: "Daily output 1M" },
  { id: "vol-5m",          name: "Eruption",           category: "volume",     icon: "🌋", conditionKo: "일일 output 5M",         conditionEn: "Daily output 5M" },
  { id: "vol-10m",         name: "Thunder",            category: "volume",     icon: "⚡", conditionKo: "일일 output 10M",        conditionEn: "Daily output 10M" },
  { id: "vol-20m",         name: "Supernova",          category: "volume",     icon: "🪐", conditionKo: "일일 output 20M",        conditionEn: "Daily output 20M" },

  // Cumulative (4)
  { id: "commits-50",      name: "Builder",            category: "cumulative", icon: "🧱", conditionKo: "누적 커밋 50건",         conditionEn: "50 cumulative commits" },
  { id: "commits-200",     name: "Architect",          category: "cumulative", icon: "🏗️", conditionKo: "누적 커밋 200건",        conditionEn: "200 cumulative commits" },
  { id: "commits-500",     name: "Monument",           category: "cumulative", icon: "🏛️", conditionKo: "누적 커밋 500건",        conditionEn: "500 cumulative commits" },
  { id: "prs-50",          name: "City Planner",       category: "cumulative", icon: "🌆", conditionKo: "누적 PR 50건",           conditionEn: "50 cumulative PRs" },

  // Multi-tool (3)
  { id: "dual-wielder",    name: "Dual Wielder",       category: "multi",      icon: "🤖", conditionKo: "2개 도구 사용",          conditionEn: "2 tools used" },
  { id: "triple-threat",   name: "Triple Threat",      category: "multi",      icon: "🎯", conditionKo: "3개 도구 모두 사용",     conditionEn: "All 3 tools used" },
  { id: "polyglot",        name: "Polyglot",           category: "multi",      icon: "🔄", conditionKo: "3개 이상 모델 사용",     conditionEn: "3+ models used" },

  // Champion (4)
  { id: "weekly-champ-1",  name: "Weekly Champion",    category: "champion",   icon: "🏆", conditionKo: "주간 1위 1회",           conditionEn: "Weekly #1 once" },
  { id: "weekly-champ-3",  name: "Reigning Champion",  category: "champion",   icon: "👑", conditionKo: "주간 1위 3회 연속",      conditionEn: "Weekly #1 3x consecutive" },
  { id: "weekly-champ-10", name: "Veteran Champion",   category: "champion",   icon: "🎖️", conditionKo: "주간 1위 누적 10회",     conditionEn: "Weekly #1 10x total" },
  { id: "weekly-champ-20", name: "GOAT",               category: "champion",   icon: "🐐", conditionKo: "주간 1위 누적 20회",     conditionEn: "Weekly #1 20x total" },

  // Time-based (3)
  { id: "night-owl",       name: "Night Owl",          category: "time",       icon: "🌙", conditionKo: "자정~6시 활동",          conditionEn: "Activity 00:00-06:00" },
  { id: "early-bird",      name: "Early Bird",         category: "time",       icon: "🌤️", conditionKo: "6시~8시 활동",           conditionEn: "Activity 06:00-08:00" },
  { id: "weekend-warrior", name: "Weekend Warrior",    category: "time",       icon: "🗓️", conditionKo: "주말 활동",              conditionEn: "Weekend activity" },

  // Level Milestone (2)
  { id: "wizard-class",    name: "Wizard Class",       category: "milestone",  icon: "🧙", conditionKo: "Lv.5 달성",             conditionEn: "Reach Lv.5" },
  { id: "transcendence",   name: "Transcendence",      category: "milestone",  icon: "🐉", conditionKo: "Lv.8 AI Native 달성",   conditionEn: "Reach Lv.8 AI Native" },
];

// Category display order & labels
export const ACHIEVEMENT_CATEGORIES = [
  { key: "onboarding",  labelKo: "입문",      labelEn: "Onboarding" },
  { key: "streak",       labelKo: "스트릭",    labelEn: "Streak" },
  { key: "volume",       labelKo: "볼륨",      labelEn: "Volume" },
  { key: "cumulative",   labelKo: "누적",      labelEn: "Cumulative" },
  { key: "multi",        labelKo: "멀티 도구", labelEn: "Multi-tool" },
  { key: "champion",     labelKo: "챔피언",    labelEn: "Champion" },
  { key: "time",         labelKo: "시간대",    labelEn: "Time" },
  { key: "milestone",    labelKo: "레벨",      labelEn: "Level" },
] as const;
```

**Step 2: Commit**
```bash
git add token-dashboard/src/lib/gamification.ts
git commit -m "feat(rank): add gamification constants — levels, achievements, types"
```

---

### Task 2: 게이미피케이션 엔진 — XP 계산 & 업적 판정

**Files:**
- Modify: `token-dashboard/src/lib/gamification.ts` (append)

**Step 1: XP/레벨/업적 계산 함수 추가**

```typescript
import { resolveActorName } from "@/lib/constants";
import { TEAM_MEMBERS, NAME_TO_AVATAR } from "@/lib/constants";
import { startOfWeek, format, parseISO } from "date-fns";
import type { ClaudeCodeDataPoint } from "@/lib/types";

// === Tool Detection ===
function detectTool(model: string): "claude" | "codex" | "gemini" {
  if (model.startsWith("gpt")) return "codex";
  if (model.startsWith("gemini")) return "gemini";
  return "claude";
}

// === Level Resolver ===
export function getLevel(xp: number): LevelInfo {
  let result = LEVELS[0];
  for (const lv of LEVELS) {
    if (xp >= lv.requiredXp) result = lv;
    else break;
  }
  return result;
}

export function getNextLevel(currentLevel: LevelInfo): LevelInfo | null {
  const idx = LEVELS.findIndex((l) => l.level === currentLevel.level);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

// === Streak Calculator ===
function calcStreak(activeDates: string[]): { current: number; max: number } {
  if (activeDates.length === 0) return { current: 0, max: 0 };
  const sorted = [...new Set(activeDates)].sort();
  let max = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 1;
    }
  }
  return { current, max };
}

// === Daily Output Max ===
function maxDailyOutput(data: ClaudeCodeDataPoint[], email: string): number {
  const dailyMap = new Map<string, number>();
  for (const d of data) {
    if (d.actor.email_address?.toLowerCase() !== email) continue;
    dailyMap.set(d.date, (dailyMap.get(d.date) ?? 0) + d.output_tokens);
  }
  return Math.max(0, ...dailyMap.values());
}

// === Weekly Champions ===
function getWeeklyChampionHistory(data: ClaudeCodeDataPoint[]): Map<string, string> {
  // weekKey -> winner name
  const weekUserMap = new Map<string, Map<string, number>>();
  for (const d of data) {
    if (!d.date) continue;
    const weekStart = startOfWeek(parseISO(d.date), { weekStartsOn: 1 });
    const weekKey = format(weekStart, "yyyy-MM-dd");
    const name = resolveActorName(d.actor);
    const tokens = d.input_tokens + d.output_tokens + d.cache_read_tokens;
    if (!weekUserMap.has(weekKey)) weekUserMap.set(weekKey, new Map());
    const userMap = weekUserMap.get(weekKey)!;
    userMap.set(name, (userMap.get(name) ?? 0) + tokens);
  }
  const winners = new Map<string, string>();
  for (const [weekKey, userMap] of weekUserMap) {
    let topName = "", topTokens = 0;
    for (const [name, tokens] of userMap) {
      if (tokens > topTokens) { topName = name; topTokens = tokens; }
    }
    if (topName) winners.set(weekKey, topName);
  }
  return winners;
}

// === Achievement Evaluator ===
function evaluateAchievements(profile: {
  totalTokens: number; totalCommits: number; totalPRs: number;
  maxStreak: number; level: number; tools: Set<string>; models: Set<string>;
  maxDailyOutput: number; weeklyChampWins: number; weeklyChampConsecutive: number;
  hasWeekendActivity: boolean; hasNightActivity: boolean; hasEarlyActivity: boolean;
}): string[] {
  const earned: string[] = [];
  const p = profile;

  // Onboarding
  if (p.totalTokens > 0) earned.push("first-light");
  if (p.totalCommits > 0) earned.push("first-commit");
  if (p.totalPRs > 0) earned.push("first-pr");
  if (p.level >= 2) earned.push("level-up");

  // Streak
  const streakThresholds = [2,3,5,7,14,30,60,100,150,200,365,500,1000];
  const streakIds = ["streak-2","streak-3","streak-5","streak-7","streak-14","streak-30","streak-60","streak-100","streak-150","streak-200","streak-365","streak-500","streak-1000"];
  for (let i = 0; i < streakThresholds.length; i++) {
    if (p.maxStreak >= streakThresholds[i]) earned.push(streakIds[i]);
  }

  // Volume
  if (p.maxDailyOutput >= 100_000) earned.push("vol-100k");
  if (p.maxDailyOutput >= 1_000_000) earned.push("vol-1m");
  if (p.maxDailyOutput >= 5_000_000) earned.push("vol-5m");
  if (p.maxDailyOutput >= 10_000_000) earned.push("vol-10m");
  if (p.maxDailyOutput >= 20_000_000) earned.push("vol-20m");

  // Cumulative
  if (p.totalCommits >= 50) earned.push("commits-50");
  if (p.totalCommits >= 200) earned.push("commits-200");
  if (p.totalCommits >= 500) earned.push("commits-500");
  if (p.totalPRs >= 50) earned.push("prs-50");

  // Multi-tool
  if (p.tools.size >= 2) earned.push("dual-wielder");
  if (p.tools.size >= 3) earned.push("triple-threat");
  if (p.models.size >= 3) earned.push("polyglot");

  // Champion
  if (p.weeklyChampWins >= 1) earned.push("weekly-champ-1");
  if (p.weeklyChampConsecutive >= 3) earned.push("weekly-champ-3");
  if (p.weeklyChampWins >= 10) earned.push("weekly-champ-10");
  if (p.weeklyChampWins >= 20) earned.push("weekly-champ-20");

  // Time-based
  if (p.hasNightActivity) earned.push("night-owl");
  if (p.hasEarlyActivity) earned.push("early-bird");
  if (p.hasWeekendActivity) earned.push("weekend-warrior");

  // Level milestones
  if (p.level >= 5) earned.push("wizard-class");
  if (p.level >= 8) earned.push("transcendence");

  return earned;
}

// === Main: Build All Profiles ===
export function buildProfiles(data: ClaudeCodeDataPoint[]): UserProfile[] {
  // Group by email
  const userDataMap = new Map<string, ClaudeCodeDataPoint[]>();
  for (const d of data) {
    const email = (d.actor.email_address ?? d.actor.id).toLowerCase();
    if (!userDataMap.has(email)) userDataMap.set(email, []);
    userDataMap.get(email)!.push(d);
  }

  const champions = getWeeklyChampionHistory(data);

  const profiles: UserProfile[] = [];
  for (const [email, points] of userDataMap) {
    const name = resolveActorName(points[0].actor);
    const member = TEAM_MEMBERS.find((m) => m.email.toLowerCase() === email);

    // Aggregate stats
    let totalTokens = 0, totalCommits = 0, totalPRs = 0;
    const activeDates: string[] = [];
    const tools = new Set<string>();
    const models = new Set<string>();

    for (const d of points) {
      totalTokens += d.input_tokens + d.output_tokens;
      totalCommits += d.commits;
      totalPRs += d.pull_requests;
      if (d.date) activeDates.push(d.date);
      tools.add(detectTool(d.model));
      models.add(d.model);
    }

    const activeDays = new Set(activeDates).size;
    const { current: currentStreak, max: maxStreak } = calcStreak(activeDates);

    // XP calculation
    const tokenXp = Math.floor(totalTokens / 10_000);
    const dayXp = activeDays * 50;
    const commitXp = totalCommits * 10;
    const prXp = totalPRs * 30;
    // Streak bonus: days with streak >= 3 get 1.5x (approximation: add 50% of streak days above 3)
    const streakBonusDays = Math.max(0, maxStreak - 2);
    const streakBonus = Math.floor(streakBonusDays * 50 * 0.5);
    const xp = tokenXp + dayXp + commitXp + prXp + streakBonus;

    const level = getLevel(xp);
    const nextLevel = getNextLevel(level);
    const xpInLevel = xp - level.requiredXp;
    const xpToNext = nextLevel ? nextLevel.requiredXp - level.requiredXp : 0;
    const progressPercent = xpToNext > 0 ? Math.min(100, Math.round((xpInLevel / xpToNext) * 100)) : 100;

    // Weekly champion stats for this user
    let weeklyChampWins = 0, weeklyChampConsecutive = 0, tempConsecutive = 0;
    const sortedWeeks = [...champions.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [, winner] of sortedWeeks) {
      if (winner === name) { weeklyChampWins++; tempConsecutive++; weeklyChampConsecutive = Math.max(weeklyChampConsecutive, tempConsecutive); }
      else { tempConsecutive = 0; }
    }

    // Time-based (approximate from date — we don't have hour info, so default false for now)
    // TODO: if hour data becomes available, enable these
    const hasWeekendActivity = activeDates.some((d) => { const day = new Date(d).getDay(); return day === 0 || day === 6; });

    const dailyOutput = maxDailyOutput(data, email);

    const earnedAchievements = evaluateAchievements({
      totalTokens, totalCommits, totalPRs, maxStreak,
      level: level.level, tools, models, maxDailyOutput: dailyOutput,
      weeklyChampWins, weeklyChampConsecutive,
      hasWeekendActivity, hasNightActivity: false, hasEarlyActivity: false,
    });

    profiles.push({
      email, name, avatar: member?.avatar,
      xp, level, nextLevel, xpInLevel, xpToNext, progressPercent,
      totalTokens, activeDays, totalCommits, totalPRs,
      currentStreak, maxStreak, earnedAchievements, tools, models,
    });
  }

  return profiles.sort((a, b) => b.xp - a.xp);
}
```

**Step 2: Commit**
```bash
git add token-dashboard/src/lib/gamification.ts
git commit -m "feat(rank): add XP calculator, streak, achievement evaluator, buildProfiles"
```

---

### Task 3: /rank 페이지 — CharacterCard 컴포넌트

**Files:**
- Create: `token-dashboard/src/components/rank/CharacterCard.tsx`

**Step 1: 캐릭터 카드 UI**

- Props: `UserProfile`
- 다크 테마 `#111111` 배경, `#E8FF47` 액센트 XP 바
- 아바타 + 이름 + Lv + 칭호 + XP 바
- 4개 스탯 (토큰, 활동일, 커밋, PR)
- 획득 업적 뱃지 미리보기 (최대 7개 + "+N")
- 모바일: 스탯 2→1열

**Step 2: Commit**
```bash
git add token-dashboard/src/components/rank/CharacterCard.tsx
git commit -m "feat(rank): add CharacterCard component"
```

---

### Task 4: /rank 페이지 — PartyRanking 컴포넌트

**Files:**
- Create: `token-dashboard/src/components/rank/PartyRanking.tsx`

**Step 1: 파티 랭킹 테이블**

- Props: `UserProfile[]`
- 테이블: #, 아바타, 이름, Lv, 칭호(아이콘+텍스트), XP
- XP 미설치자(0 XP) → Lv.1 🌱 Code Sprout 으로 표시
- 현재 선택된 유저 행 하이라이트 (`#E8FF47/10` 배경)
- 모바일: 칭호 텍스트 숨김, 아이콘만

**Step 2: Commit**
```bash
git add token-dashboard/src/components/rank/PartyRanking.tsx
git commit -m "feat(rank): add PartyRanking table component"
```

---

### Task 5: /rank 페이지 — AchievementGrid 컴포넌트

**Files:**
- Create: `token-dashboard/src/components/rank/AchievementGrid.tsx`

**Step 1: 업적 도감 UI**

- Props: `earnedAchievements: string[]`
- 카테고리별 그룹 (ACHIEVEMENT_CATEGORIES 순서)
- 획득 = 컬러 아이콘 + 이름, 미획득 = `?` 회색 + 잠금 스타일
- 호버/터치 시 조건 tooltip (InfoTip 재사용)
- 상단: "획득 N/38" 카운터

**Step 2: Commit**
```bash
git add token-dashboard/src/components/rank/AchievementGrid.tsx
git commit -m "feat(rank): add AchievementGrid component"
```

---

### Task 6: /rank 페이지 조립

**Files:**
- Create: `token-dashboard/src/app/rank/page.tsx`

**Step 1: 페이지 조립**

- `useAnalytics()` + `buildProfiles(data)` 호출
- 유저 선택 드롭다운 (localStorage 기억)
- 4 섹션: CharacterCard → PartyRanking → AchievementGrid → WeeklyChampions
- 페이지 타이틀: "⚔️ Adventurer's Guild"

**Step 2: Commit**
```bash
git add token-dashboard/src/app/rank/page.tsx
git commit -m "feat(rank): add /rank page with all sections"
```

---

### Task 7: Sidebar에 /rank 메뉴 추가

**Files:**
- Modify: `token-dashboard/src/components/layout/Sidebar.tsx`
- Modify: `token-dashboard/src/lib/i18n.ts`

**Step 1: i18n 키 추가**
```typescript
"nav.rank": { ko: "Rank", en: "Rank" },
"rank.title": { ko: "모험가 길드", en: "Adventurer's Guild" },
// ... 기타 rank 관련 번역 키
```

**Step 2: Sidebar 메뉴 항목 추가**
- `⚔️ Rank` 항목을 Setup 위에 배치

**Step 3: Commit**
```bash
git add token-dashboard/src/components/layout/Sidebar.tsx token-dashboard/src/lib/i18n.ts
git commit -m "feat(rank): add Rank to sidebar navigation + i18n keys"
```

---

### Task 8: WeeklyChampions 리뉴얼

**Files:**
- Modify: `token-dashboard/src/components/cards/WeeklyChampions.tsx`

**Step 1: 레벨 뱃지 추가**
- 이름 앞에 `Lv.N 아이콘` 표시
- `buildProfiles`에서 레벨 정보 가져오기 (or 별도 경량 함수)
- 하단에 "모험가 길드 →" 링크 (`/rank`)

**Step 2: Commit**
```bash
git add token-dashboard/src/components/cards/WeeklyChampions.tsx
git commit -m "feat(rank): add level badges to WeeklyChampions + link to /rank"
```

---

### Task 9: 빌드 & 동기화

**Step 1: 빌드 확인**
```bash
cd token-dashboard && npx next build
```

**Step 2: 모노레포 커밋 & push**
```bash
git add -A && git commit -m "feat(token-dashboard): RPG gamification — /rank page with levels, XP, achievements"
git push
```

**Step 3: token-dashboard 별도 repo 동기화**
```bash
./scripts/sync-token-dashboard.sh
```
(또는 GitHub Actions 자동 동기화 대기)

---

## Summary

| Task | 내용 | 파일 |
|------|------|------|
| 1 | 상수 & 타입 | `gamification.ts` |
| 2 | XP/레벨/업적 엔진 | `gamification.ts` |
| 3 | CharacterCard | `components/rank/CharacterCard.tsx` |
| 4 | PartyRanking | `components/rank/PartyRanking.tsx` |
| 5 | AchievementGrid | `components/rank/AchievementGrid.tsx` |
| 6 | /rank 페이지 | `app/rank/page.tsx` |
| 7 | Sidebar + i18n | `Sidebar.tsx`, `i18n.ts` |
| 8 | WeeklyChampions 리뉴얼 | `WeeklyChampions.tsx` |
| 9 | 빌드 & 배포 | — |
