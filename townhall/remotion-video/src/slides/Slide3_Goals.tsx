import React from "react";
import { AbsoluteFill, interpolate, Easing } from "remotion";
import { C, fadeIn, expandW, countUp } from "../utils";

const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";

const buCards = [
  {
    label: "KR",
    target: "₩1.3B",
    confirmed: "₩330M",
    pct: 25.4,
    gap: "Gap  -₩970M",
    note: "* Incl. ₩300M KTO Production",
  },
  {
    label: "PLANNING",
    target: "₩2.2B",
    confirmed: "₩850M",
    pct: 38.8,
    gap: "Gap  -₩1.35B",
    note: null,
  },
  {
    label: "GLOBAL",
    target: "₩8.5B",
    confirmed: "₩960M",
    pct: 11.2,
    gap: "Gap  -₩7.5B",
    note: null,
  },
];

const barWidth = (frame: number, delay: number, target: number): string => {
  const val = interpolate(frame, [delay, delay + 40], [0, target], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return `${val}%`;
};

const pctCount = (frame: number, delay: number, target: number): string => {
  const val = interpolate(frame, [delay, delay + 40], [0, target], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return val.toFixed(1);
};

export const Slide3_Goals: React.FC<{ frame: number }> = ({ frame }) => {
  const overall = countUp(frame, 40, 75, 17.8).toFixed(1);

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
        Revenue Goal Achievement
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
        Annual Goal Achievement (Confirmed Deals)
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
        {overall}%
      </div>

      {/* KPI Sub */}
      <div
        style={{
          opacity: fadeIn(frame, 100),
          fontSize: 13,
          color: C.grey,
          marginTop: 14,
        }}
      >
        Annual Target: ₩12B &nbsp;|&nbsp; Confirmed: ₩2.1B &nbsp;|&nbsp; Remaining: ₩9.9B
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

      {/* BU Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          flex: 1,
        }}
      >
        {buCards.map((card, idx) => {
          const cardDelay = 118 + idx * 8;
          const barDelay = 130 + idx * 10;
          return (
            <div
              key={card.label}
              style={{
                opacity: fadeIn(frame, cardDelay),
                background: C.cardBg,
                border: `1px solid ${C.cardBorder}`,
                borderRadius: 8,
                padding: "22px 24px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* BU Label */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.yellow,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                {card.label}
              </div>

              {/* Target */}
              <div
                style={{
                  fontSize: 10,
                  color: C.greyDark,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                TARGET
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: C.white,
                  letterSpacing: "-0.02em",
                  marginBottom: 12,
                }}
              >
                {card.target}
              </div>

              {/* Confirmed */}
              <div
                style={{
                  fontSize: 10,
                  color: C.greyDark,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                CONFIRMED
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#CCC",
                  marginBottom: 16,
                }}
              >
                {card.confirmed}
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: "100%",
                  height: 5,
                  background: "#222",
                  borderRadius: 3,
                  marginBottom: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: barWidth(frame, barDelay, card.pct),
                    height: "100%",
                    background: C.yellow,
                    borderRadius: 3,
                  }}
                />
              </div>

              {/* Percentage */}
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  color: C.yellow,
                  letterSpacing: "-0.02em",
                  marginBottom: 6,
                }}
              >
                {pctCount(frame, barDelay, card.pct)}%
              </div>

              {/* Gap */}
              <div
                style={{ fontSize: 11, color: C.greyDark, marginBottom: card.note ? 6 : 0 }}
              >
                {card.gap}
              </div>

              {/* Note */}
              {card.note && (
                <div style={{ fontSize: 9, color: "#FF5252", marginTop: 4 }}>
                  {card.note}
                </div>
              )}
            </div>
          );
        })}
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
        03 / 04
      </div>
    </AbsoluteFill>
  );
};
