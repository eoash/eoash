# Board (게시판) Implementation Plan

**Goal:** Notion DB를 데이터 소스로 하는 게시판 — 공지 + 프로덕트 공유 + 이모지 반응

**Architecture:** Notion API → Next.js API Route (ISR) → React 컴포넌트. 이모지 반응은 POST로 Notion 숫자 속성 +1/-1, localStorage로 중복 방지.

**Tech Stack:** Next.js 16, @notionhq/client, Tailwind 4, i18n (기존 패턴)

---

## Task 1: Notion SDK 설치 + 환경변수

**Files:**
- Modify: `package.json`

**Step 1: 패키지 설치**

```bash
cd token-dashboard && npm install @notionhq/client
```

**Step 2: Vercel 환경변수 설정**

```bash
npx vercel env add NOTION_BOARD_DB_ID
npx vercel env add NOTION_API_KEY
```

로컬 `.env.local`에도 추가:
```
NOTION_BOARD_DB_ID=<Notion DB ID>
NOTION_API_KEY=<Notion Integration Token>
```

**Step 3: 커밋**

```bash
git add package.json package-lock.json
git commit -m "chore(token-dashboard): add @notionhq/client"
```

---

## Task 2: Notion 클라이언트 + 타입 정의

**Files:**
- Create: `src/lib/notion-board.ts`

**Step 1: Notion 클라이언트 및 타입 구현**

```typescript
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_ID = process.env.NOTION_BOARD_DB_ID ?? "";

export interface BoardPost {
  id: string;
  title: string;
  category: "공지" | "프로덕트";
  body: string;
  author: string;
  thumbnail: string | null;   // Files & Media URL
  link: string | null;        // 프로덕트 URL
  pinned: boolean;
  date: string;               // YYYY-MM-DD
  reactions: {
    "👍": number;
    "💡": number;
    "🙌": number;
  };
}

export type ReactionEmoji = "👍" | "💡" | "🙌";

export async function fetchBoardPosts(): Promise<BoardPost[]> {
  if (!DB_ID) return [];

  const res = await notion.databases.query({
    database_id: DB_ID,
    filter: { property: "공개", checkbox: { equals: true } },
    sorts: [
      { property: "고정", direction: "descending" },
      { property: "날짜", direction: "descending" },
    ],
  });

  return res.results.map((page) => {
    const p = page as Record<string, unknown>;
    const props = p.properties as Record<string, Record<string, unknown>>;

    const titleArr = props["제목"]?.title as Array<{ plain_text: string }> | undefined;
    const bodyArr = props["본문"]?.rich_text as Array<{ plain_text: string }> | undefined;
    const catSelect = props["카테고리"]?.select as { name: string } | null;
    const authorSelect = props["작성자"]?.select as { name: string } | null;
    const files = props["썸네일"]?.files as Array<{ file?: { url: string }; external?: { url: string } }> | undefined;
    const linkUrl = props["링크"]?.url as string | null;
    const pinned = (props["고정"]?.checkbox as boolean) ?? false;
    const dateObj = props["날짜"]?.date as { start: string } | null;

    return {
      id: p.id as string,
      title: titleArr?.map((t) => t.plain_text).join("") ?? "",
      category: (catSelect?.name === "프로덕트" ? "프로덕트" : "공지") as BoardPost["category"],
      body: bodyArr?.map((t) => t.plain_text).join("") ?? "",
      author: authorSelect?.name ?? "",
      thumbnail: files?.[0]?.file?.url ?? files?.[0]?.external?.url ?? null,
      link: linkUrl,
      pinned,
      date: dateObj?.start ?? "",
      reactions: {
        "👍": (props["👍"]?.number as number) ?? 0,
        "💡": (props["💡"]?.number as number) ?? 0,
        "🙌": (props["🙌"]?.number as number) ?? 0,
      },
    };
  });
}

export async function updateReaction(pageId: string, emoji: ReactionEmoji, delta: 1 | -1): Promise<void> {
  // 현재 값 조회
  const page = await notion.pages.retrieve({ page_id: pageId });
  const props = (page as Record<string, unknown>).properties as Record<string, Record<string, unknown>>;
  const current = (props[emoji]?.number as number) ?? 0;
  const next = Math.max(0, current + delta);

  await notion.pages.update({
    page_id: pageId,
    properties: { [emoji]: { number: next } },
  });
}
```

**Step 2: 커밋**

```bash
git add src/lib/notion-board.ts
git commit -m "feat(token-dashboard): Notion board client + types"
```

---

## Task 3: API Route (`/api/board`)

**Files:**
- Create: `src/app/api/board/route.ts`

**Step 1: GET (글 목록) + POST (반응) 구현**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchBoardPosts, updateReaction, type ReactionEmoji } from "@/lib/notion-board";

const VALID_EMOJIS: ReactionEmoji[] = ["👍", "💡", "🙌"];

export async function GET() {
  try {
    const posts = await fetchBoardPosts();
    return NextResponse.json({ posts }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    console.error("Board fetch error:", e);
    return NextResponse.json({ posts: [] }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageId, emoji, delta } = body as {
      pageId: string;
      emoji: ReactionEmoji;
      delta: 1 | -1;
    };

    if (!pageId || !VALID_EMOJIS.includes(emoji) || ![1, -1].includes(delta)) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    await updateReaction(pageId, emoji, delta);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Board reaction error:", e);
    return NextResponse.json({ error: "Failed to update reaction" }, { status: 502 });
  }
}
```

**Step 2: 커밋**

```bash
git add src/app/api/board/route.ts
git commit -m "feat(token-dashboard): /api/board GET + POST endpoints"
```

---

## Task 4: i18n 키 추가

**Files:**
- Modify: `src/lib/i18n.ts`

**Step 1: Board 관련 번역 키 추가**

`"period.allTime"` 뒤에 추가:

```typescript
  // ── Board ──
  "nav.board": { ko: "Board", en: "Board" },
  "board.title": { ko: "게시판", en: "Board" },
  "board.latest": { ko: "최신 글", en: "Latest Posts" },
  "board.more": { ko: "더보기 →", en: "See more →" },
  "board.all": { ko: "전체", en: "All" },
  "board.notice": { ko: "공지", en: "Notice" },
  "board.product": { ko: "프로덕트", en: "Product" },
  "board.pinned": { ko: "고정", en: "Pinned" },
  "board.empty": { ko: "아직 게시글이 없습니다", en: "No posts yet" },
  "board.reaction.done": { ko: "반영됨!", en: "Done!" },
```

**Step 2: 커밋**

```bash
git add src/lib/i18n.ts
git commit -m "feat(token-dashboard): board i18n keys"
```

---

## Task 5: ReactionBar 컴포넌트

**Files:**
- Create: `src/components/board/ReactionBar.tsx`

**Step 1: 이모지 반응 버튼 컴포넌트**

```tsx
"use client";

import { useState, useEffect } from "react";
import type { ReactionEmoji } from "@/lib/notion-board";

const STORAGE_KEY = "board-reactions";
const EMOJIS: ReactionEmoji[] = ["👍", "💡", "🙌"];

interface Props {
  postId: string;
  reactions: Record<ReactionEmoji, number>;
  compact?: boolean;  // Overview 위젯용 작은 사이즈
}

function loadReacted(): Record<string, ReactionEmoji[]> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch { return {}; }
}

function saveReacted(data: Record<string, ReactionEmoji[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function ReactionBar({ postId, reactions, compact }: Props) {
  const [counts, setCounts] = useState(reactions);
  const [reacted, setReacted] = useState<ReactionEmoji[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = loadReacted();
    setReacted(stored[postId] ?? []);
  }, [postId]);

  const toggle = async (emoji: ReactionEmoji) => {
    const already = reacted.includes(emoji);
    const delta = already ? -1 : 1;

    // Optimistic update
    setCounts((prev) => ({ ...prev, [emoji]: Math.max(0, prev[emoji] + delta) }));
    const next = already ? reacted.filter((e) => e !== emoji) : [...reacted, emoji];
    setReacted(next);
    const stored = loadReacted();
    stored[postId] = next;
    saveReacted(stored);

    // API call
    try {
      await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: postId, emoji, delta }),
      });
    } catch { /* silently fail — optimistic UI already updated */ }
  };

  if (!mounted) return null;

  return (
    <div className={`flex gap-1.5 ${compact ? "mt-1.5" : "mt-3"}`}>
      {EMOJIS.map((emoji) => {
        const active = reacted.includes(emoji);
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors cursor-pointer ${
              active
                ? "border-[#00E87A]/40 bg-[#00E87A]/10 text-[#00E87A]"
                : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500 hover:text-gray-300"
            }`}
          >
            <span>{emoji}</span>
            <span>{counts[emoji]}</span>
          </button>
        );
      })}
    </div>
  );
}
```

**Step 2: 커밋**

```bash
git add src/components/board/ReactionBar.tsx
git commit -m "feat(token-dashboard): ReactionBar component"
```

---

## Task 6: PostCard 컴포넌트

**Files:**
- Create: `src/components/board/PostCard.tsx`

**Step 1: 공지/프로덕트 겸용 카드**

```tsx
import type { BoardPost } from "@/lib/notion-board";
import ReactionBar from "./ReactionBar";

interface Props {
  post: BoardPost;
  compact?: boolean;  // Overview 위젯용
}

export default function PostCard({ post, compact }: Props) {
  const isProduct = post.category === "프로덕트";

  return (
    <div className={`rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden transition-colors hover:border-gray-700 ${compact ? "" : ""}`}>
      {/* 프로덕트 썸네일 */}
      {isProduct && post.thumbnail && !compact && (
        <div className="aspect-video bg-gray-800 overflow-hidden">
          <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className={compact ? "p-3" : "p-4"}>
        {/* 카테고리 + 고정 배지 */}
        <div className="flex items-center gap-1.5 mb-1.5">
          {post.pinned && (
            <span className="text-[10px] font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.5 rounded">📌</span>
          )}
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            isProduct
              ? "text-[#00E87A] bg-[#00E87A]/10"
              : "text-[#3B82F6] bg-[#3B82F6]/10"
          }`}>
            {isProduct ? "프로덕트" : "공지"}
          </span>
        </div>

        {/* 제목 */}
        {post.link ? (
          <a href={post.link} target="_blank" rel="noopener noreferrer"
            className={`font-semibold text-gray-100 hover:text-[#00E87A] transition-colors line-clamp-1 ${compact ? "text-sm" : "text-base"}`}>
            {post.title}
          </a>
        ) : (
          <h3 className={`font-semibold text-gray-100 line-clamp-1 ${compact ? "text-sm" : "text-base"}`}>
            {post.title}
          </h3>
        )}

        {/* 본문 (compact에서는 숨김) */}
        {!compact && post.body && (
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{post.body}</p>
        )}

        {/* 작성자 + 날짜 */}
        <div className={`flex items-center gap-2 text-gray-500 ${compact ? "text-[10px] mt-1" : "text-xs mt-2"}`}>
          <span>{post.author}</span>
          <span>·</span>
          <span>{post.date.slice(5)}</span>
        </div>

        {/* 반응 */}
        <ReactionBar postId={post.id} reactions={post.reactions} compact={compact} />
      </div>
    </div>
  );
}
```

**Step 2: 커밋**

```bash
git add src/components/board/PostCard.tsx
git commit -m "feat(token-dashboard): PostCard component"
```

---

## Task 7: BoardFeed (전체 목록) + `/board` 페이지

**Files:**
- Create: `src/components/board/BoardFeed.tsx`
- Create: `src/app/board/page.tsx`

**Step 1: BoardFeed 컴포넌트**

```tsx
"use client";

import { useState } from "react";
import type { BoardPost } from "@/lib/notion-board";
import PostCard from "./PostCard";
import { useT } from "@/lib/contexts/LanguageContext";

type Filter = "all" | "공지" | "프로덕트";

export default function BoardFeed({ posts }: { posts: BoardPost[] }) {
  const { t } = useT();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = filter === "all" ? posts : posts.filter((p) => p.category === filter);
  const pinned = filtered.filter((p) => p.pinned);
  const rest = filtered.filter((p) => !p.pinned);

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: t("board.all") },
    { key: "공지", label: t("board.notice") },
    { key: "프로덕트", label: t("board.product") },
  ];

  return (
    <div>
      {/* 탭 필터 */}
      <div className="flex gap-2 mb-6">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === key
                ? "bg-[#00E87A]/15 text-[#00E87A] border border-[#00E87A]/30"
                : "bg-gray-800/50 text-gray-400 border border-gray-700 hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-gray-500 text-center py-12">{t("board.empty")}</div>
      ) : (
        <>
          {/* 고정 공지 */}
          {pinned.length > 0 && (
            <div className="flex flex-col gap-3 mb-6">
              {pinned.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          )}

          {/* 나머지 글 — 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rest.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        </>
      )}
    </div>
  );
}
```

**Step 2: `/board` 페이지**

```tsx
"use client";

import { useEffect, useState } from "react";
import BoardFeed from "@/components/board/BoardFeed";
import type { BoardPost } from "@/lib/notion-board";
import { useT } from "@/lib/contexts/LanguageContext";

export default function BoardPage() {
  const { t } = useT();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/board")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("board.title")}</h1>
      {loading ? (
        <div className="text-gray-400 text-center py-12">{t("common.loading")}</div>
      ) : (
        <BoardFeed posts={posts} />
      )}
    </div>
  );
}
```

**Step 3: 커밋**

```bash
git add src/components/board/BoardFeed.tsx src/app/board/page.tsx
git commit -m "feat(token-dashboard): /board page + BoardFeed"
```

---

## Task 8: LatestPosts (Overview 위젯)

**Files:**
- Create: `src/components/board/LatestPosts.tsx`
- Modify: `src/app/page.tsx`

**Step 1: LatestPosts 위젯**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BoardPost } from "@/lib/notion-board";
import PostCard from "./PostCard";
import { useT } from "@/lib/contexts/LanguageContext";

export default function LatestPosts() {
  const { t } = useT();
  const [posts, setPosts] = useState<BoardPost[]>([]);

  useEffect(() => {
    fetch("/api/board")
      .then((r) => r.json())
      .then((d) => setPosts((d.posts ?? []).slice(0, 3)))
      .catch(() => {});
  }, []);

  if (posts.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{t("board.latest")}</h2>
        <Link href="/board" className="text-sm text-[#00E87A] hover:underline">
          {t("board.more")}
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} compact />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Overview 페이지에 위젯 삽입**

`src/app/page.tsx` — `WeeklyChampions` 섹션 뒤에 추가:

```tsx
import LatestPosts from "@/components/board/LatestPosts";
// ...
          {/* 기존 LeaderboardTable + WeeklyChampions 뒤 */}
          <LatestPosts />
```

**Step 3: 커밋**

```bash
git add src/components/board/LatestPosts.tsx src/app/page.tsx
git commit -m "feat(token-dashboard): LatestPosts widget on Overview"
```

---

## Task 9: Sidebar에 Board 메뉴 추가

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Step 1: menuIcons에 /board 아이콘 추가**

`/rank` 아이콘 뒤에:

```tsx
  "/board": (/* clipboard-list */ <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="1.5" width="10" height="13" rx="1.5"/><path d="M6 1.5V3h4V1.5"/><path d="M6 6.5h4M6 9h4M6 11.5h2"/></svg>),
```

**Step 2: menuItems에 /board 추가 (Overview 바로 뒤)**

```tsx
const menuItems: { labelKey: TranslationKey; href: string }[] = [
  { labelKey: "nav.overview", href: "/" },
  { labelKey: "nav.board", href: "/board" },       // ← 추가
  { labelKey: "nav.leaderboard", href: "/leaderboard" },
  // ... 나머지 그대로
];
```

**Step 3: 커밋**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(token-dashboard): Board menu in Sidebar"
```

---

## Task 10: Notion DB 생성 + 테스트 데이터 + 빌드 검증

**Step 1: Notion에서 DB 생성**

Notion에 "Token Dashboard Board" 데이터베이스 생성, 위 스키마대로 속성 추가.
Integration 연결 후 DB ID와 API Key를 `.env.local`에 설정.

**Step 2: 테스트 데이터 추가**

Notion DB에 2~3개 샘플 글 추가:
- 공지: "v4.2 업데이트 — cache_creation 버그 수정" (고정, 공개)
- 프로덕트: "온보딩 챗봇" (썸네일 + 링크, 공개)

**Step 3: 빌드 확인**

```bash
cd token-dashboard && npm run build
```

**Step 4: 로컬 테스트**

```bash
npm run dev
# http://localhost:3000 → Overview에 LatestPosts 위젯 확인
# http://localhost:3000/board → 전체 게시판 확인
# 이모지 클릭 → Notion DB에 숫자 변경 확인
```

**Step 5: 최종 커밋 + 배포**

```bash
git add -A && git commit -m "feat(token-dashboard): Board 게시판 기능 완성"
npx vercel --prod --yes
```
