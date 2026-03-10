const NOTION_API = "https://api.notion.com/v1";
const API_KEY = process.env.NOTION_API_KEY ?? "";
const DB_ID = process.env.NOTION_BOARD_DB_ID ?? "";

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
