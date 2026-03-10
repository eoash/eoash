const NOTION_API = "https://api.notion.com/v1";
const API_KEY = process.env.NOTION_API_KEY ?? "";
const DB_ID = process.env.NOTION_BOARD_DB_ID ?? "";
const COMMENTS_DB_ID = process.env.NOTION_COMMENTS_DB_ID ?? "";

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

export interface BoardPost {
  id: string;
  title: string;
  category: "공지" | "프로덕트";
  body: string;
  author: string;
  thumbnail: string | null;
  link: string | null;
  pinned: boolean;
  date: string; // YYYY-MM-DD
  reactions: {
    "👍": number;
    "💡": number;
    "🙌": number;
  };
}

export type ReactionEmoji = "👍" | "💡" | "🙌";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePage(p: any): BoardPost {
  const props = p.properties ?? {};

  const titleArr = props["제목"]?.title as
    | Array<{ plain_text: string }>
    | undefined;
  const bodyArr = props["본문"]?.rich_text as
    | Array<{ plain_text: string }>
    | undefined;
  const catSelect = props["카테고리"]?.select as { name: string } | null;
  const authorSelect = props["작성자"]?.select as { name: string } | null;
  const files = props["썸네일"]?.files as
    | Array<{
        file?: { url: string };
        external?: { url: string };
      }>
    | undefined;
  const linkUrl = props["링크"]?.url as string | null;
  const pinned = (props["고정"]?.checkbox as boolean) ?? false;
  const dateObj = props["날짜"]?.date as { start: string } | null;

  return {
    id: p.id as string,
    title: titleArr?.map((t) => t.plain_text).join("") ?? "",
    category: (catSelect?.name === "프로덕트"
      ? "프로덕트"
      : "공지") as BoardPost["category"],
    body: bodyArr?.map((t) => t.plain_text).join("") ?? "",
    author: authorSelect?.name ?? "",
    thumbnail:
      files?.[0]?.file?.url ?? files?.[0]?.external?.url ?? null,
    link: linkUrl,
    pinned,
    date: dateObj?.start ?? "",
    reactions: {
      "👍": (props["👍"]?.number as number) ?? 0,
      "💡": (props["💡"]?.number as number) ?? 0,
      "🙌": (props["🙌"]?.number as number) ?? 0,
    },
  };
}

export async function fetchBoardPosts(): Promise<BoardPost[]> {
  if (!DB_ID || !API_KEY) return [];

  const res = await fetch(`${NOTION_API}/databases/${DB_ID}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      filter: { property: "공개", checkbox: { equals: true } },
      sorts: [
        { property: "고정", direction: "descending" },
        { property: "날짜", direction: "descending" },
      ],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Notion query failed:", res.status, await res.text());
    return [];
  }

  const data = await res.json();
  return (data.results ?? []).map(parsePage);
}

export async function createPost(
  title: string,
  body: string,
  category: "공지" | "프로덕트",
  author: string,
  link?: string,
): Promise<BoardPost> {
  if (!DB_ID || !API_KEY) throw new Error("Board DB not configured");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {
    "제목": { title: [{ text: { content: title } }] },
    "본문": { rich_text: [{ text: { content: body } }] },
    "카테고리": { select: { name: category } },
    "작성자": { select: { name: author } },
    "고정": { checkbox: false },
    "공개": { checkbox: true },
    "날짜": { date: { start: new Date().toISOString().slice(0, 10) } },
    "👍": { number: 0 },
    "💡": { number: 0 },
    "🙌": { number: 0 },
  };

  if (link) {
    properties["링크"] = { url: link };
  }

  const res = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      parent: { database_id: DB_ID },
      properties,
    }),
  });

  if (!res.ok) {
    throw new Error(`Post create failed: ${res.status}`);
  }

  const page = await res.json();
  return parsePage(page);
}

export async function updateReaction(
  pageId: string,
  emoji: ReactionEmoji,
  delta: 1 | -1,
): Promise<void> {
  // 현재 값 조회
  const pageRes = await fetch(`${NOTION_API}/pages/${pageId}`, { headers });
  if (!pageRes.ok) throw new Error(`Page fetch failed: ${pageRes.status}`);
  const page = await pageRes.json();

  const current = (page.properties?.[emoji]?.number as number) ?? 0;
  const next = Math.max(0, current + delta);

  const updateRes = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      properties: { [emoji]: { number: next } },
    }),
  });

  if (!updateRes.ok) {
    throw new Error(`Reaction update failed: ${updateRes.status}`);
  }
}

export async function archivePost(pageId: string): Promise<void> {
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ archived: true }),
  });

  if (!res.ok) {
    throw new Error(`Archive failed: ${res.status}`);
  }
}

// ── Comments ──

export interface BoardComment {
  id: string;
  postId: string;
  author: string;
  content: string;
  createdAt: string; // ISO datetime
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseComment(p: any): BoardComment {
  const props = p.properties ?? {};
  const contentArr = props["내용"]?.title as
    | Array<{ plain_text: string }>
    | undefined;
  const postIdArr = props["post_id"]?.rich_text as
    | Array<{ plain_text: string }>
    | undefined;
  const authorArr = props["작성자"]?.rich_text as
    | Array<{ plain_text: string }>
    | undefined;

  return {
    id: p.id as string,
    postId: postIdArr?.map((t) => t.plain_text).join("") ?? "",
    author: authorArr?.map((t) => t.plain_text).join("") ?? "",
    content: contentArr?.map((t) => t.plain_text).join("") ?? "",
    createdAt: props["작성일"]?.created_time ?? p.created_time ?? "",
  };
}

export async function fetchComments(postId: string): Promise<BoardComment[]> {
  if (!COMMENTS_DB_ID || !API_KEY) return [];

  const res = await fetch(`${NOTION_API}/databases/${COMMENTS_DB_ID}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      filter: {
        property: "post_id",
        rich_text: { equals: postId },
      },
      sorts: [{ property: "작성일", direction: "ascending" }],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Comments query failed:", res.status, await res.text());
    return [];
  }

  const data = await res.json();
  return (data.results ?? []).map(parseComment);
}

export async function createComment(
  postId: string,
  author: string,
  content: string,
): Promise<BoardComment> {
  if (!COMMENTS_DB_ID || !API_KEY) {
    throw new Error("Comments DB not configured");
  }

  const res = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      parent: { database_id: COMMENTS_DB_ID },
      properties: {
        "내용": { title: [{ text: { content } }] },
        post_id: { rich_text: [{ text: { content: postId } }] },
        "작성자": { rich_text: [{ text: { content: author } }] },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Comment create failed: ${res.status}`);
  }

  const page = await res.json();
  return parseComment(page);
}
