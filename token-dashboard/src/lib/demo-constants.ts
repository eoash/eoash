/**
 * Demo mode constants — fictional team members for public screenshots.
 * Activated by NEXT_PUBLIC_DEMO_MODE=true
 */
import type { TeamMember } from "./constants";

// randomuser.me: 실제 사람 프로필 사진 (고정 ID → 항상 동일 이미지)
const P = (gender: "men" | "women", id: number) =>
  `https://randomuser.me/api/portraits/${gender}/${id}.jpg`;

export const DEMO_TEAM_MEMBERS: TeamMember[] = [
  // Power users (3)
  { email: "alex.kim@acme.dev", name: "Alex", avatar: P("men", 32) },
  { email: "mia.chen@acme.dev", name: "Mia", avatar: P("women", 44) },
  { email: "jake.park@acme.dev", name: "Jake", avatar: P("men", 75) },
  // Medium users (5)
  { email: "sora.lee@acme.dev", name: "Sora", avatar: P("women", 68) },
  { email: "noah.jung@acme.dev", name: "Noah", avatar: P("men", 11) },
  { email: "hana.choi@acme.dev", name: "Hana", avatar: P("women", 17) },
  { email: "leo.yoon@acme.dev", name: "Leo", avatar: P("men", 53) },
  { email: "emma.han@acme.dev", name: "Emma", avatar: P("women", 90) },
  // Light users (5)
  { email: "ryan.oh@acme.dev", name: "Ryan", avatar: P("men", 22) },
  { email: "yuna.bae@acme.dev", name: "Yuna", avatar: P("women", 33) },
  { email: "sam.kang@acme.dev", name: "Sam", avatar: P("men", 46) },
  { email: "luna.seo@acme.dev", name: "Luna", avatar: P("women", 55) },
  { email: "dan.lim@acme.dev", name: "Dan", avatar: P("men", 64) },
  // Minimal users (3)
  { email: "jin.na@acme.dev", name: "Jin", avatar: P("men", 81) },
  { email: "ari.moon@acme.dev", name: "Ari", avatar: P("women", 26) },
  { email: "kai.ryu@acme.dev", name: "Kai", avatar: P("men", 7) },
];

export const DEMO_EMAIL_ALIAS: Record<string, string> = {};
