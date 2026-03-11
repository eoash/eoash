import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// 레벨별 그라데이션 컬러
const LEVEL_COLORS: Record<string, [string, string]> = {
  "1": ["#666", "#888"],
  "2": ["#4A9EFF", "#6BB5FF"],
  "3": ["#00E87A", "#4AFFA0"],
  "4": ["#00CED1", "#48D1CC"],
  "5": ["#A855F7", "#C084FC"],
  "6": ["#F59E0B", "#FBBF24"],
  "7": ["#EF4444", "#F97316"],
  "8": ["#E8FF47", "#00E87A"],
};

const LEVEL_ICONS: Record<string, string> = {
  "1": "📡", "2": "🛰️", "3": "🌍", "4": "🧬",
  "5": "☄️", "6": "🚀", "7": "🌌", "8": "✦",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const name = searchParams.get("name") || "Explorer";
  const level = searchParams.get("level") || "1";
  const title = searchParams.get("title") || "Scout";
  const icon = searchParams.get("icon") || "📡";
  const xp = searchParams.get("xp") || "0";
  const streak = searchParams.get("streak") || "0";
  const log = searchParams.get("log") || "";
  const prevLevel = searchParams.get("prevLevel") || "";
  const prevTitle = searchParams.get("prevTitle") || "";
  const avatar = searchParams.get("avatar") || "";

  const [color1, color2] = LEVEL_COLORS[level] || ["#666", "#888"];
  const prevColor = prevLevel ? (LEVEL_COLORS[prevLevel] || ["#666", "#888"])[0] : "#666";
  const prevIcon = prevLevel ? (LEVEL_ICONS[prevLevel] || "📡") : "";
  const formattedXp = Number(xp).toLocaleString();
  const hasPrev = prevLevel && prevTitle;

  return new ImageResponse(
    (
      <div
        style={{
          width: "800px",
          height: "418px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          background: "#0A0A0A",
        }}
      >
        {/* === Top accent bar (thick) === */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            height: "6px",
            display: "flex",
            background: `linear-gradient(90deg, ${color1}, ${color2})`,
          }}
        />

        {/* === Background glow === */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "50px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            display: "flex",
            background: `radial-gradient(circle, ${color1}18 0%, transparent 60%)`,
          }}
        />

        {/* === Main content === */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            padding: "32px 48px",
            gap: "40px",
          }}
        >
          {/* === LEFT: Avatar === */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              flexShrink: 0,
            }}
          >
            {/* Avatar circle with border */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "160px",
                height: "160px",
                borderRadius: "50%",
                border: `4px solid ${color1}`,
                boxShadow: `0 0 30px ${color1}40`,
                overflow: "hidden",
                background: `linear-gradient(135deg, ${color1}30, ${color2}30)`,
              }}
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt=""
                  width={152}
                  height={152}
                  style={{ borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ display: "flex", fontSize: "72px", lineHeight: "1" }}>
                  {icon}
                </div>
              )}
            </div>

            {/* Level badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 24px",
                borderRadius: "20px",
                background: `linear-gradient(135deg, ${color1}, ${color2})`,
                boxShadow: `0 0 16px ${color1}50`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#0A0A0A",
                  letterSpacing: "2px",
                }}
              >
                Lv.{level}
              </div>
            </div>
          </div>

          {/* === RIGHT: Text info === */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              gap: "4px",
            }}
          >
            {/* LEVEL UP label */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "16px",
                  fontWeight: 900,
                  color: color1,
                  letterSpacing: "6px",
                }}
              >
                ★ LEVEL UP
              </div>
              <div
                style={{
                  display: "flex",
                  height: "2px",
                  flex: 1,
                  background: `linear-gradient(90deg, ${color1}80, transparent)`,
                }}
              />
            </div>

            {/* Name — big and bold */}
            <div
              style={{
                display: "flex",
                fontSize: "52px",
                fontWeight: 900,
                color: "#FFFFFF",
                lineHeight: "1.1",
              }}
            >
              {name}
            </div>

            {/* Title with icon */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "4px",
              }}
            >
              <div style={{ display: "flex", fontSize: "28px" }}>{icon}</div>
              <div
                style={{
                  display: "flex",
                  fontSize: "28px",
                  fontWeight: 700,
                  background: `linear-gradient(90deg, ${color1}, ${color2})`,
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {title}
              </div>
            </div>

            {/* Level transition */}
            {hasPrev && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "12px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.06)",
                  border: "2px solid rgba(255,255,255,0.10)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "18px",
                    color: prevColor,
                    opacity: "0.6",
                  }}
                >
                  <span>{prevIcon}</span>
                  <span>Lv.{prevLevel} {prevTitle}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "22px",
                    color: color1,
                    fontWeight: 900,
                  }}
                >
                  →
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: color1,
                  }}
                >
                  <span>{icon}</span>
                  <span>Lv.{level} {title}</span>
                </div>
              </div>
            )}

            {/* System log */}
            {log && (
              <div
                style={{
                  display: "flex",
                  fontSize: "14px",
                  color: "#777",
                  fontFamily: "monospace",
                  letterSpacing: "0.5px",
                  marginTop: "8px",
                }}
              >
                {log}
              </div>
            )}
          </div>
        </div>

        {/* === Bottom bar === */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 48px 24px",
            gap: "32px",
          }}
        >
          {/* Divider line */}
          <div
            style={{
              position: "absolute",
              left: "48px",
              right: "48px",
              bottom: "56px",
              height: "2px",
              display: "flex",
              background: `linear-gradient(90deg, ${color1}40, ${color2}20, transparent)`,
            }}
          />

          {/* XP */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", fontSize: "14px", color: "#666", fontWeight: 700, letterSpacing: "1px" }}>
              XP
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "22px",
                fontWeight: 900,
                color: color1,
              }}
            >
              {formattedXp}
            </div>
          </div>

          {/* Streak */}
          {Number(streak) > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", fontSize: "14px", color: "#666", fontWeight: 700, letterSpacing: "1px" }}>
                STREAK
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "22px",
                  fontWeight: 900,
                  color: "#F59E0B",
                }}
              >
                🔥{streak}d
              </div>
            </div>
          )}

          {/* Brand */}
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              fontSize: "13px",
              color: "#444",
              fontWeight: 700,
              letterSpacing: "2px",
            }}
          >
            EO STUDIO
          </div>
        </div>
      </div>
    ),
    {
      width: 800,
      height: 418,
    },
  );
}
