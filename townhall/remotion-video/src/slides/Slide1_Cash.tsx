import React from "react";
import { AbsoluteFill } from "remotion";
import { C, fadeIn, expandW, countUp } from "../utils";

const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";

const rows = [
  { label: "Korea", value: "₩95M" },
  { label: "US", value: "$71K · ₩103M" },
  { label: "Vietnam", value: "₩12M" },
];

const changes = [
  { label: "Korea", value: "▼ ₩47M" },
  { label: "US", value: "▼ ₩94M" },
  { label: "Vietnam", value: "▼ ₩13M" },
];

export const Slide1_Cash: React.FC<{ frame: number }> = ({ frame }) => {
  const cash = Math.round(countUp(frame, 40, 75, 209));

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
        Cash Position
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
        Consolidated Cash Balance
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
        ₩{cash}M
      </div>

      {/* KPI Sub */}
      <div
        style={{
          opacity: fadeIn(frame, 100),
          fontSize: 15,
          color: C.red,
          fontWeight: 700,
          marginTop: 14,
        }}
      >
        ▼ ₩154M vs. Last Month
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
        {/* By Entity */}
        <div
          style={{
            opacity: fadeIn(frame, 118),
            background: C.cardBg,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 8,
            padding: "24px 28px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              color: C.greyDark,
              textTransform: "uppercase",
              marginBottom: 16,
              fontWeight: 700,
            }}
          >
            By Entity
          </div>
          {rows.map((row, idx) => (
            <div
              key={row.label}
              style={{
                opacity: fadeIn(frame, 122 + idx * 8),
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "10px 0",
                borderBottom:
                  idx < rows.length - 1 ? `1px solid ${C.dividerLight}` : "none",
              }}
            >
              <span style={{ fontSize: 14, color: "#CCC" }}>{row.label}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.white }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Net Change */}
        <div
          style={{
            opacity: fadeIn(frame, 122),
            background: C.cardBg,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 8,
            padding: "24px 28px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              color: C.greyDark,
              textTransform: "uppercase",
              marginBottom: 16,
              fontWeight: 700,
            }}
          >
            Net Change Jan → Feb
          </div>
          {changes.map((row, idx) => (
            <div
              key={row.label}
              style={{
                opacity: fadeIn(frame, 128 + idx * 8),
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "10px 0",
                borderBottom:
                  idx < changes.length - 1
                    ? `1px solid ${C.dividerLight}`
                    : "none",
              }}
            >
              <span style={{ fontSize: 14, color: "#CCC" }}>{row.label}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.red }}>
                {row.value}
              </span>
            </div>
          ))}
          <div
            style={{
              opacity: fadeIn(frame, 150),
              marginTop: 14,
              paddingTop: 14,
              borderTop: `1px solid #2A2A2A`,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 13, color: "#888", fontWeight: 700 }}>
              Total
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.red }}>
              ▼ ₩154M
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
        01 / 04
      </div>
    </AbsoluteFill>
  );
};
