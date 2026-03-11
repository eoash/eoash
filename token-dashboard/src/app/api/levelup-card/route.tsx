import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// 레벨별 글로우 컬러
const LEVEL_COLORS: Record<string, [string, string]> = {
  "1": ["#888", "#AAA"],
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

  const [c1, c2] = LEVEL_COLORS[level] || ["#888", "#AAA"];
  const prevColor = prevLevel ? (LEVEL_COLORS[prevLevel] || ["#888"])[0] : "#888";
  const prevIcon = prevLevel ? (LEVEL_ICONS[prevLevel] || "📡") : "";
  const fmtXp = Number(xp).toLocaleString();
  const hasPrev = prevLevel && prevTitle;

  // 파티클 위치 (별/점)
  const particles = [
    { t: "18px", l: "45%", s: 3, o: 0.6 },
    { t: "60px", l: "72%", s: 2, o: 0.4 },
    { t: "35px", l: "88%", s: 4, o: 0.5 },
    { t: "120px", l: "92%", s: 2, o: 0.3 },
    { t: "200px", l: "95%", s: 3, o: 0.5 },
    { t: "280px", l: "85%", s: 2, o: 0.4 },
    { t: "90px", l: "15%", s: 2, o: 0.3 },
    { t: "320px", l: "8%", s: 3, o: 0.4 },
    { t: "160px", l: "5%", s: 2, o: 0.5 },
    { t: "50px", l: "35%", s: 2, o: 0.3 },
    { t: "350px", l: "55%", s: 2, o: 0.3 },
    { t: "300px", l: "40%", s: 3, o: 0.4 },
  ];

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
          background: "linear-gradient(135deg, #0B1426 0%, #0D1B2A 40%, #0F2030 100%)",
        }}
      >
        {/* === Background glow effects === */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "-40px",
            width: "450px",
            height: "450px",
            borderRadius: "50%",
            display: "flex",
            background: `radial-gradient(circle, ${c1}15 0%, ${c1}06 40%, transparent 65%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-120px",
            right: "-60px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            display: "flex",
            background: `radial-gradient(circle, ${c2}10 0%, transparent 55%)`,
          }}
        />

        {/* === Particles === */}
        {particles.map((p, i) => (
          <div
            key={`p-${i}`}
            style={{
              position: "absolute",
              top: p.t,
              left: p.l,
              width: `${p.s}px`,
              height: `${p.s}px`,
              borderRadius: "50%",
              background: i % 3 === 0 ? c1 : i % 3 === 1 ? "#FFF" : c2,
              opacity: p.o,
              display: "flex",
            }}
          />
        ))}

        {/* === Top accent line === */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            height: "3px",
            display: "flex",
            background: `linear-gradient(90deg, transparent 5%, ${c1}80 30%, ${c2} 50%, ${c1}80 70%, transparent 95%)`,
          }}
        />

        {/* === Outer frame border (subtle) === */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            right: "8px",
            bottom: "8px",
            borderRadius: "16px",
            border: `1px solid ${c1}20`,
            display: "flex",
          }}
        />

        {/* ================ MAIN CONTENT ================ */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flex: 1,
            padding: "28px 40px 0 40px",
            gap: "36px",
          }}
        >
          {/* === LEFT: Avatar with glow rings === */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
              flexShrink: 0,
              paddingTop: "8px",
            }}
          >
            {/* Outer glow ring */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${c1}08 60%, transparent 100%)`,
                border: `2px solid ${c1}35`,
                boxShadow: `0 0 40px ${c1}20, 0 0 80px ${c1}10`,
                position: "relative",
              }}
            >
              {/* Inner glow ring */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "176px",
                  height: "176px",
                  borderRadius: "50%",
                  border: `3px solid ${c1}70`,
                  boxShadow: `0 0 24px ${c1}30, inset 0 0 20px ${c1}10`,
                  overflow: "hidden",
                  background: `linear-gradient(180deg, ${c1}15 0%, ${c1}05 100%)`,
                }}
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt=""
                    width={170}
                    height={170}
                    style={{ borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ display: "flex", fontSize: "80px", lineHeight: "1" }}>
                    {icon}
                  </div>
                )}
              </div>
            </div>

            {/* Level badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 28px",
                borderRadius: "8px",
                background: `linear-gradient(135deg, ${c1}25, ${c1}15)`,
                border: `2px solid ${c1}60`,
                boxShadow: `0 0 12px ${c1}25`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "24px",
                  fontWeight: 900,
                  color: c1,
                  letterSpacing: "3px",
                }}
              >
                Lv.{level}
              </div>
            </div>
          </div>

          {/* === RIGHT: Text content === */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              gap: "2px",
              paddingBottom: "10px",
            }}
          >
            {/* [ ] LEVEL UP header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "14px",
                  color: `${c1}60`,
                  fontWeight: 700,
                }}
              >
                [
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "36px",
                  fontWeight: 900,
                  color: c1,
                  letterSpacing: "5px",
                  textShadow: `0 0 20px ${c1}40`,
                }}
              >
                LEVEL UP
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "14px",
                  color: `${c1}60`,
                  fontWeight: 700,
                }}
              >
                ]
              </div>
              <div
                style={{
                  display: "flex",
                  height: "2px",
                  flex: 1,
                  background: `linear-gradient(90deg, ${c1}50, transparent)`,
                }}
              />
            </div>

            {/* Name */}
            <div
              style={{
                display: "flex",
                fontSize: "52px",
                fontWeight: 900,
                color: "#FFFFFF",
                lineHeight: "1.1",
                textShadow: "0 2px 10px rgba(0,0,0,0.5)",
              }}
            >
              {name}
            </div>

            {/* Icon + Title */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginTop: "6px",
              }}
            >
              <div style={{ display: "flex", fontSize: "32px" }}>{icon}</div>
              <div
                style={{
                  display: "flex",
                  fontSize: "32px",
                  fontWeight: 800,
                  color: c1,
                  textShadow: `0 0 16px ${c1}30`,
                }}
              >
                {title}
              </div>
            </div>

            {/* Level transition box */}
            {hasPrev && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "20px",
                  marginTop: "16px",
                  padding: "12px 20px",
                  borderRadius: "12px",
                  background: `linear-gradient(135deg, ${c1}08, ${c1}04)`,
                  border: `2px solid ${c1}30`,
                  boxShadow: `inset 0 0 20px ${c1}05`,
                }}
              >
                {/* Previous level */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  <div style={{ display: "flex", fontSize: "28px" }}>{prevIcon}</div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "14px",
                      color: prevColor,
                      opacity: "0.7",
                      fontWeight: 700,
                    }}
                  >
                    Lv.{prevLevel}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "16px",
                      color: "#AAA",
                      fontWeight: 600,
                    }}
                  >
                    {prevTitle}
                  </div>
                </div>

                {/* Arrow */}
                <div
                  style={{
                    display: "flex",
                    fontSize: "28px",
                    color: c1,
                    fontWeight: 900,
                    textShadow: `0 0 10px ${c1}40`,
                  }}
                >
                  →
                </div>

                {/* New level */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  <div style={{ display: "flex", fontSize: "28px" }}>{icon}</div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "14px",
                      color: c1,
                      fontWeight: 900,
                    }}
                  >
                    Lv.{level}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "16px",
                      color: c1,
                      fontWeight: 700,
                    }}
                  >
                    {title}
                  </div>
                </div>
              </div>
            )}

            {/* System log */}
            {log && !hasPrev && (
              <div
                style={{
                  display: "flex",
                  fontSize: "14px",
                  color: `${c1}80`,
                  fontFamily: "monospace",
                  letterSpacing: "0.5px",
                  marginTop: "12px",
                }}
              >
                {log}
              </div>
            )}
          </div>
        </div>

        {/* ================ BOTTOM BAR ================ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "0 40px 20px",
          }}
        >
          {/* Divider */}
          <div
            style={{
              display: "flex",
              height: "2px",
              marginBottom: "14px",
              background: `linear-gradient(90deg, transparent 2%, ${c1}40 20%, ${c1}60 50%, ${c1}40 80%, transparent 98%)`,
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "40px",
            }}
          >
            {/* XP */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: "14px",
                  color: `${c1}90`,
                  fontWeight: 800,
                  letterSpacing: "2px",
                }}
              >
                XP
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "28px",
                  fontWeight: 900,
                  color: "#FFF",
                  textShadow: `0 0 12px ${c1}30`,
                }}
              >
                {fmtXp}
              </div>
            </div>

            {/* Streak */}
            {Number(streak) > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ display: "flex", fontSize: "24px" }}>🔥</div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "14px",
                    color: "#F59E0B",
                    fontWeight: 800,
                    letterSpacing: "2px",
                  }}
                >
                  STREAK
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "28px",
                    fontWeight: 900,
                    color: "#F59E0B",
                  }}
                >
                  {streak}d
                </div>
              </div>
            )}

            {/* Brand */}
            <div
              style={{
                display: "flex",
                marginLeft: "auto",
                fontSize: "14px",
                color: `${c1}50`,
                fontWeight: 800,
                letterSpacing: "3px",
              }}
            >
              EO STUDIO
            </div>
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
