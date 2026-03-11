import { NextRequest, NextResponse } from "next/server";
import { createVerifyToken } from "@/lib/board-auth";
import { TEAM_MEMBERS } from "@/lib/constants";

const BOT_TOKEN = (process.env.SLACK_BOT_TOKEN ?? "").trim();

export async function POST(req: NextRequest) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 500 });
  }

  const { name } = (await req.json()) as { name: string };
  const member = TEAM_MEMBERS.find((m) => m.name === name);
  if (!member) {
    return NextResponse.json({ error: "Unknown member" }, { status: 400 });
  }

  // Look up Slack user by email
  const lookupRes = await fetch(
    `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(member.email)}`,
    { headers: { Authorization: `Bearer ${BOT_TOKEN}` } },
  );
  const lookupData = await lookupRes.json();
  if (!lookupData.ok) {
    return NextResponse.json(
      { error: "Slack 계정을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  const slackUserId = lookupData.user.id;

  // Generate magic link token (5 min expiry)
  const origin = req.nextUrl.origin;
  const token = createVerifyToken(name, member.email, member.avatar);
  const magicLink = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}`;

  // Open DM channel
  const dmRes = await fetch("https://slack.com/api/conversations.open", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ users: slackUserId }),
  });
  const dmData = await dmRes.json();
  if (!dmData.ok) {
    return NextResponse.json(
      { error: "DM 채널을 열 수 없습니다" },
      { status: 500 },
    );
  }

  // Send magic link via DM
  const msgRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: dmData.channel.id,
      text: `AI Explorer's Log 게시판 로그인 요청이 있습니다.\n아래 링크를 클릭하면 로그인됩니다 (5분 유효):\n${magicLink}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*AI Explorer's Log 게시판 로그인* :key:",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "게시판 로그인 요청이 있습니다.\n본인이 맞다면 아래 버튼을 클릭하세요.\n_5분 후 만료됩니다._",
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "로그인하기" },
              url: magicLink,
              style: "primary",
            },
          ],
        },
      ],
    }),
  });
  const msgData = await msgRes.json();
  if (!msgData.ok) {
    return NextResponse.json(
      { error: "메시지 발송 실패" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
