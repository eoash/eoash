import crypto from "crypto";

export type { BoardUser } from "./board-types";
import type { BoardUser } from "./board-types";

const SECRET = (process.env.SLACK_BOT_TOKEN ?? "dev-secret").trim();
const COOKIE_NAME = "board-session";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days

// ── Cookie signing ──

function sign(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

function verify(token: string): BoardUser | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  if (sig !== expected) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return { name: payload.name, email: payload.email, avatar: payload.avatar };
  } catch {
    return null;
  }
}

// ── Public helpers ──

export function createSessionCookie(user: BoardUser): string {
  const token = sign({ ...user, exp: Date.now() + MAX_AGE * 1000 });
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getUserFromCookies(cookieHeader: string | null): BoardUser | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verify(match[1]);
}

// ── Magic link token (5 min expiry) ──

const MAGIC_LINK_TTL = 5 * 60 * 1000; // 5 minutes

export function createVerifyToken(name: string, email: string, avatar?: string): string {
  return sign({ name, email, avatar, exp: Date.now() + MAGIC_LINK_TTL });
}

export function verifyMagicToken(token: string): BoardUser | null {
  return verify(token);
}
