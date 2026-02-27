import React from "react";
import { AbsoluteFill } from "remotion";
import { C, fadeIn, expandW, countUp } from "../utils";

const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";

const monthlyRows = [
  { bu: "KR Content", jan: "₩1.6M", feb: "₩13.1M", total: "₩14.7M" },
  { bu: "KR Planet", jan: "₩6.5M", feb: "₩5.0M", total: "₩11.5M" },
  { bu: "GL Global", jan: "₩320.7M", feb: "₩85.2M", total: "₩405.9M" },
];

const yoyRows = [
  { bu: "GL Global", ref: "2025: ₩319M", pct: "+27%", color: "#0AFF6C" },
  { bu: "KR Content", ref: "2025: ₩63M", pct: "-77%", color: "#FF2D55" },
  { bu: "KR Planet", ref: "2025: ₩87M", pct: "-87%", color: "#FF2D55" },
];

export const Slide2_Revenue: React.FC<{ frame: number }> = ({ frame }) => {
  const revenue = Math.round(countUp(frame, 40, 75, 432));

  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        fontFamily: FONT,
        color: C.white,
        padding: "56px 72px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Tag */}
      <div
        style={{
          opacity: fadeIn(frame, 0),
          fontSize: 11,
          letterSpacing: "0.2em",
          color: C.yellow,
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        FINANCE · 2026.02
      </div>

      {/* Title */}
      <div
        style={{
          opacity: fadeIn(frame, 5),
          fontSize: 22,
          fontWeight: 700,
          color: C.yellow,
          letterSpacing: "-0.01em",
        }}
      >
        Revenue
      </div>

      {/* Divider 1 */}
      <div
        style={{
          width: expandW(frame, 15, 25),
          height: 1,
          background: C.divider,
          margin: "28px 0",
        }}
      />

      {/* KPI Label */}
      <div
        style={{
          opacity: fadeIn(frame, 30),
          fontSize: 13,
          color: C.grey,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        Jan–Feb Cumulative Revenue
      </div>

      {/* KPI Number */}
      <div
        style={{
          opacity: fadeIn(frame, 35),
          fontSize: 88,
          fontWeight: 800,
          color: C.white,
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        ₩{revenue}M
      </div>

      {/* KPI Sub */}
      <div
        style={{
          opacity: fadeIn(frame, 100),
          fontSize: 15,
          color: C.grey,
          marginTop: 14,
        }}
      >
        Global 94% Contribution · YoY -8% (Same BU Base)
      </div>

      {/* Divider 2 */}
      <div
        style={{
          width: expandW(frame, 108, 22),
          height: 1,
          background: C.divider,
          margin: "28px 0",
        }}
      />

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Monthly Revenue */}
        <div
          style={{
            opacity: fadeIn(frame, 118),
            background: C.cardBg,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 8,
            padding: "20px 24px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              color: C.greyDark,
              textTransform: "uppercase",
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            Monthly Revenue
          </div>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 70px 70px 70px",
              paddingBottom: 8,
              borderBottom: `1px solid ${C.divider}`,
              marginBottom: 4,
            }}
          >
            {["BU", "Jan", "Feb", "Total"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 10,
                  color: C.greyDark,
                  letterSpacing: "0.1em",
                  textAlign: h === "BU" ? "left" : "right",
                }}
              >
                {h}
              </span>
            ))}
          </div>
          {/* Rows */}
          {monthlyRows.map((row, idx) => (
            <div
              key={row.bu}
              style={{
                opacity: fadeIn(frame, 124 + idx * 8),
                display: "grid",
                gridTemplateColumns: "1fr 70px 70px 70px",
                padding: "8px 0",
                borderBottom:
                  idx < monthlyRows.length - 1
                    ? `1px solid ${C.dividerLight}`
                    : "none",
                alignItems: "baseline",
              }}
            >
              <span style={{ fontSize: 13, color: "#CCC" }}>{row.bu}</span>
              <span style={{ fontSize: 12, color: C.grey, textAlign: "right" }}>
                {row.jan}
              </span>
              <span style={{ fontSize: 12, color: C.white, textAlign: "right", fontWeight: 600 }}>
                {row.feb}
              </span>
              <span style={{ fontSize: 12, color: C.yellow, textAlign: "right", fontWeight: 700 }}>
                {row.total}
              </span>
            </div>
          ))}
          {/* Total Row */}
          <div
            style={{
              opacity: fadeIn(frame, 148),
              display: "grid",
              gridTemplateColumns: "1fr 70px 70px 70px",
              paddingTop: 10,
              marginTop: 6,
              borderTop: `1px solid #2A2A2A`,
            }}
          >
            <span style={{ fontSize: 13, color: "#AAA", fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 13, color: C.white, textAlign: "right", fontWeight: 700 }}>₩328.9M</span>
            <span style={{ fontSize: 13, color: C.white, textAlign: "right", fontWeight: 700 }}>₩103.3M</span>
            <span style={{ fontSize: 13, color: C.yellow, textAlign: "right", fontWeight: 700 }}>₩432.2M</span>
          </div>
        </div>

        {/* YoY Comparison */}
        <div
          style={{
            opacity: fadeIn(frame, 122),
            background: C.cardBg,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 8,
            padding: "20px 24px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              color: C.greyDark,
              textTransform: "uppercase",
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            YoY 2025 vs 2026 (Same BU)
          </div>
          {yoyRows.map((row, idx) => (
            <div
              key={row.bu}
              style={{
                opacity: fadeIn(frame, 128 + idx * 8),
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom:
                  idx < yoyRows.length - 1 ? `1px solid ${C.dividerLight}` : "none",
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>
                  {row.bu}
                </div>
                <div style={{ fontSize: 11, color: C.greyDark, marginTop: 3 }}>
                  {row.ref}
                </div>
              </div>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: row.color,
                  letterSpacing: "-0.02em",
                }}
              >
                {row.pct}
              </span>
            </div>
          ))}
          {/* Overall */}
          <div
            style={{
              opacity: fadeIn(frame, 152),
              marginTop: 14,
              paddingTop: 14,
              borderTop: `1px solid #2A2A2A`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, color: "#888", fontWeight: 700 }}>
              Overall (Same BU)
            </span>
            <span
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: C.red,
                letterSpacing: "-0.02em",
              }}
            >
              -8%
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: 72,
          fontSize: 11,
          color: C.greyDark,
          letterSpacing: "0.1em",
        }}
      >
        EO STUDIO TOWNHALL
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 32,
          right: 72,
          fontSize: 11,
          color: C.greyDark,
          letterSpacing: "0.1em",
        }}
      >
        02 / 04
      </div>
    </AbsoluteFill>
  );
};
