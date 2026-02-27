import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { C, fadeIn } from "../utils";

const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";

const slideUp = (frame: number, delay: number, dur = 25): number =>
  interpolate(frame, [delay, delay + dur], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const Slide4_AINative: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        fontFamily: FONT,
        color: C.white,
        padding: "72px 120px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Tag */}
      <div
        style={{
          opacity: fadeIn(frame, 0),
          fontSize: 11,
          letterSpacing: "0.25em",
          color: C.yellow,
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: 32,
        }}
      >
        AI NATIVE · 2026
      </div>

      {/* Headline line 1 */}
      <div
        style={{
          opacity: fadeIn(frame, 20),
          transform: `translateY(${slideUp(frame, 20)}px)`,
          fontSize: 76,
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          color: C.white,
        }}
      >
        The Era of
      </div>

      {/* Headline line 2 */}
      <div
        style={{
          opacity: fadeIn(frame, 38),
          transform: `translateY(${slideUp(frame, 38)}px)`,
          fontSize: 76,
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          color: C.yellow,
          marginBottom: 40,
        }}
      >
        10x Leverage.
      </div>

      {/* Body 1 */}
      <div
        style={{
          opacity: fadeIn(frame, 70),
          fontSize: 17,
          color: C.grey,
          lineHeight: 1.8,
          maxWidth: 680,
          marginBottom: 8,
        }}
      >
        The only thing AI will replace is the person who refuses to use it.
      </div>

      {/* Body 2 */}
      <div
        style={{
          opacity: fadeIn(frame, 88),
          fontSize: 17,
          color: C.white,
          fontWeight: 600,
          lineHeight: 1.8,
          maxWidth: 680,
          marginBottom: 52,
        }}
      >
        Build your own 24/7 AI team to clone your workflow. That is AI Native.
      </div>

      {/* CTA Box */}
      <div
        style={{
          opacity: fadeIn(frame, 115),
          transform: `translateY(${slideUp(frame, 115, 30)}px)`,
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          border: `1px solid ${C.yellow}`,
          borderRadius: 4,
          padding: "16px 28px",
          width: "fit-content",
        }}
      >
        <span style={{ fontSize: 18, color: C.yellow }}>→</span>
        <span
          style={{
            fontSize: 14,
            color: C.yellow,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          Install Claude Code & Build Your AI Agent Team Right Now
        </span>
      </div>

      {/* Deco lines (right side) */}
      {[200, 120, 280, 80, 160].map((w, i) => (
        <div
          key={i}
          style={{
            opacity: fadeIn(frame, 80 + i * 8) * 0.15,
            position: "absolute",
            right: 72,
            top: `${30 + i * 10}%`,
            width: w,
            height: 1,
            background: C.yellow,
          }}
        />
      ))}

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
        04 / 04
      </div>
    </AbsoluteFill>
  );
};
