import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";
const BG = "#0A0A0A";
const YELLOW = "#E8FF47";
const WHITE = "#FFFFFF";
const RED = "#FF2D55";
const GREEN = "#0AFF6C";

// 씬: 각 90f (3s), 총 4씬 = 360f (12s)
const SCENE = 90;

// ── 공통 헬퍼 ──
const useSpring = (frame: number, delay = 0, cfg = { damping: 16, stiffness: 220, mass: 0.6 }) => {
  const { fps } = useVideoConfig();
  return spring({ frame: Math.max(0, frame - delay), fps, config: cfg });
};

// 단어 하나씩 튕기며 등장
const WordReveal: React.FC<{
  words: string[];
  frame: number;
  startDelay?: number;
  interval?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
}> = ({ words, frame, startDelay = 0, interval = 10, fontSize = 80, color = WHITE, fontWeight = 900 }) => {
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0 24px", lineHeight: 1.1 }}>
      {words.map((word, i) => {
        const s = spring({
          frame: Math.max(0, frame - startDelay - i * interval),
          fps,
          config: { damping: 14, stiffness: 250, mass: 0.5 },
        });
        const y = interpolate(s, [0, 1], [60, 0]);
        const opacity = interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${y}px)`,
              opacity,
              fontSize,
              fontWeight,
              color,
              fontFamily: FONT,
              letterSpacing: "-0.03em",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// ── 씬 1: Cash Position ──
const SceneCash: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();

  const bigSpring = spring({ frame: Math.max(0, frame - 0), fps, config: { damping: 12, stiffness: 180, mass: 0.8 } });
  const bigY = interpolate(bigSpring, [0, 1], [-300, 0]);
  const bigScale = interpolate(bigSpring, [0, 1], [1.5, 1]);

  const labelSpring = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 18, stiffness: 260 } });
  const labelX = interpolate(labelSpring, [0, 1], [-120, 0]);

  const downSpring = spring({ frame: Math.max(0, frame - 40), fps, config: { damping: 10, stiffness: 300, mass: 1.2 } });
  const downScale = interpolate(downSpring, [0, 1], [0, 1]);
  const downOpacity = interpolate(downSpring, [0, 0.2], [0, 1], { extrapolateRight: "clamp" });

  // 흔들림 효과
  const shake = frame >= 42 && frame <= 52
    ? Math.sin((frame - 42) * 1.8) * interpolate(frame, [42, 52], [12, 0])
    : 0;

  const subSpring = spring({ frame: Math.max(0, frame - 55), fps, config: { damping: 20, stiffness: 200 } });
  const subOpacity = interpolate(subSpring, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: BG,
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 배경 그리드 */}
      <div
        style={{
          position: "absolute", inset: 0,
          backgroundImage: `linear-gradient(${YELLOW}08 1px, transparent 1px), linear-gradient(90deg, ${YELLOW}08 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* 씬 레이블 */}
      <div style={{
        position: "absolute", top: 48, left: 72,
        opacity: interpolate(labelSpring, [0, 1], [0, 1]),
        transform: `translateX(${labelX}px)`,
        fontSize: 12, letterSpacing: "0.25em", color: YELLOW, fontWeight: 700,
        textTransform: "uppercase",
      }}>
        01 · CASH POSITION
      </div>

      {/* ₩209M 대형 */}
      <div style={{
        transform: `translateY(${bigY}px) scale(${bigScale}) translateX(${shake}px)`,
        fontSize: 160,
        fontWeight: 900,
        color: WHITE,
        letterSpacing: "-0.05em",
        lineHeight: 1,
        marginBottom: 16,
      }}>
        ₩209M
      </div>

      {/* CASH POSITION 라벨 */}
      <div style={{
        opacity: interpolate(labelSpring, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateX(${labelX}px)`,
        fontSize: 28, fontWeight: 700, color: "#444",
        letterSpacing: "0.15em", textTransform: "uppercase",
        marginBottom: 32,
      }}>
        Consolidated Cash Balance
      </div>

      {/* 감소 배지 */}
      <div style={{
        transform: `scale(${downScale}) translateX(${shake}px)`,
        opacity: downOpacity,
        background: RED, borderRadius: 6,
        padding: "14px 32px",
        fontSize: 32, fontWeight: 800, color: WHITE,
      }}>
        ▼ ₩154M vs. Last Month
      </div>

      {/* 법인별 */}
      <div style={{
        opacity: subOpacity,
        marginTop: 32,
        display: "flex", gap: 48,
        fontSize: 16, color: "#666",
      }}>
        {["Korea ₩95M", "US $71K·₩103M", "Vietnam ₩12M"].map((t) => (
          <span key={t} style={{ letterSpacing: "0.05em" }}>{t}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── 씬 2: Revenue ──
const SceneRevenue: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();

  // "REVENUE" 타이핑
  const fullText = "REVENUE";
  const visible = Math.round(interpolate(frame, [0, 18], [0, fullText.length], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  }));

  // ₩432M 각 자리 순서대로 등장
  const digits = ["₩", "4", "3", "2", "M"];
  const digitSprings = digits.map((_, i) =>
    spring({ frame: Math.max(0, frame - 22 - i * 7), fps, config: { damping: 12, stiffness: 240, mass: 0.7 } })
  );

  const statsSpring = spring({ frame: Math.max(0, frame - 60), fps, config: { damping: 18, stiffness: 200 } });
  const statsY = interpolate(statsSpring, [0, 1], [40, 0]);
  const statsOp = interpolate(statsSpring, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  const yoySpring = spring({ frame: Math.max(0, frame - 70), fps, config: { damping: 16, stiffness: 220 } });

  return (
    <AbsoluteFill
      style={{
        background: "#0D0D0D",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 좌측 세로 액센트 바 */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: interpolate(statsSpring, [0, 1], [0, 6]),
        background: YELLOW,
      }} />

      {/* 씬 레이블 */}
      <div style={{
        position: "absolute", top: 48, left: 72,
        fontSize: 12, letterSpacing: "0.25em", color: YELLOW, fontWeight: 700,
        textTransform: "uppercase",
        opacity: interpolate(statsSpring, [0, 1], [0, 1]),
      }}>
        02 · REVENUE
      </div>

      {/* REVENUE 타이핑 */}
      <div style={{
        fontSize: 24, fontWeight: 700, color: "#333",
        letterSpacing: "0.3em", textTransform: "uppercase",
        marginBottom: 8,
      }}>
        {fullText.slice(0, visible)}
        <span style={{ opacity: frame % 20 < 10 ? 1 : 0, color: YELLOW }}>|</span>
      </div>

      {/* ₩432M - 자리별 슬롯머신 등장 */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, overflow: "hidden" }}>
        {digits.map((d, i) => {
          const s = digitSprings[i];
          const y = interpolate(s, [0, 1], [120, 0]);
          const opacity = interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ overflow: "hidden" }}>
              <span style={{
                display: "inline-block",
                transform: `translateY(${y}px)`,
                opacity,
                fontSize: i === 0 ? 80 : i === digits.length - 1 ? 80 : 160,
                fontWeight: 900,
                color: YELLOW,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}>
                {d}
              </span>
            </div>
          );
        })}
      </div>

      {/* Jan-Feb 2026 */}
      <div style={{
        transform: `translateY(${statsY}px)`,
        opacity: statsOp,
        fontSize: 18, color: "#555", marginTop: 20, letterSpacing: "0.1em",
      }}>
        Jan – Feb 2026 · Cumulative
      </div>

      {/* YoY 배지들 */}
      <div style={{
        transform: `translateY(${interpolate(yoySpring, [0, 1], [30, 0])}px)`,
        opacity: interpolate(yoySpring, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
        display: "flex", gap: 24, marginTop: 40,
      }}>
        {[
          { label: "GL Global", val: "+27%", color: GREEN },
          { label: "KR Content", val: "-77%", color: RED },
          { label: "KR Planet", val: "-87%", color: RED },
          { label: "Overall", val: "-8%", color: RED },
        ].map((item) => (
          <div key={item.label} style={{
            textAlign: "center",
            border: `1px solid #222`, borderRadius: 6, padding: "12px 20px",
          }}>
            <div style={{ fontSize: 11, color: "#444", marginBottom: 4, letterSpacing: "0.1em" }}>{item.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>{item.val}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── 씬 3: Revenue Goal ──
const SceneGoals: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();

  const bigSpring = spring({ frame: Math.max(0, frame - 0), fps, config: { damping: 10, stiffness: 300, mass: 0.4 } });
  const bigScale = interpolate(bigSpring, [0, 1], [4, 1]);
  const bigOp = interpolate(bigSpring, [0, 0.2], [0, 1], { extrapolateRight: "clamp" });

  const titleSpring = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 18, stiffness: 200 } });

  const bars = [
    { label: "KR", pct: 25.4, color: YELLOW, delay: 35 },
    { label: "PLANNING", pct: 38.8, color: YELLOW, delay: 45 },
    { label: "GLOBAL", pct: 11.2, color: "#666", delay: 55 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: BG,
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: "0 80px",
      }}
    >
      {/* 씬 레이블 */}
      <div style={{
        position: "absolute", top: 48, left: 72,
        fontSize: 12, letterSpacing: "0.25em", color: YELLOW, fontWeight: 700, textTransform: "uppercase",
        opacity: interpolate(titleSpring, [0, 1], [0, 1]),
      }}>
        03 · GOAL ACHIEVEMENT
      </div>

      {/* 17.8% 폭발 등장 */}
      <div style={{
        transform: `scale(${bigScale})`,
        opacity: bigOp,
        fontSize: 180,
        fontWeight: 900,
        color: WHITE,
        letterSpacing: "-0.05em",
        lineHeight: 1,
        marginBottom: 4,
      }}>
        17.8%
      </div>

      {/* 서브 */}
      <div style={{
        opacity: interpolate(titleSpring, [0, 0.6], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)`,
        fontSize: 16, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase",
        marginBottom: 48,
      }}>
        Annual Goal · ₩12B Target
      </div>

      {/* 프로그레스 바들 */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
        {bars.map((bar) => {
          const barSpring = spring({
            frame: Math.max(0, frame - bar.delay),
            fps,
            config: { damping: 20, stiffness: 180 },
          });
          const barW = interpolate(barSpring, [0, 1], [0, bar.pct]);
          const barOp = interpolate(barSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
          const labelX = interpolate(barSpring, [0, 1], [-60, 0]);

          return (
            <div key={bar.label} style={{ opacity: barOp }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginBottom: 8,
                transform: `translateX(${labelX}px)`,
              }}>
                <span style={{ fontSize: 14, color: bar.color, fontWeight: 700, letterSpacing: "0.1em" }}>
                  {bar.label}
                </span>
                <span style={{ fontSize: 22, fontWeight: 800, color: bar.color }}>
                  {barW.toFixed(1)}%
                </span>
              </div>
              <div style={{ width: "100%", height: 8, background: "#1A1A1A", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  width: `${barW}%`,
                  height: "100%",
                  background: bar.color,
                  borderRadius: 4,
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── 씬 4: AI Native ──
const SceneAINative: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();

  const tagSpring = spring({ frame: Math.max(0, frame - 0), fps, config: { damping: 20, stiffness: 200 } });
  const tenxSpring = spring({ frame: Math.max(0, frame - 22), fps, config: { damping: 8, stiffness: 280, mass: 0.5 } });
  const tenxScale = interpolate(tenxSpring, [0, 1], [0.3, 1]);
  const tenxOp = interpolate(tenxSpring, [0, 0.25], [0, 1], { extrapolateRight: "clamp" });

  const bodySpring = spring({ frame: Math.max(0, frame - 50), fps, config: { damping: 18, stiffness: 180 } });
  const ctaSpring = spring({ frame: Math.max(0, frame - 68), fps, config: { damping: 16, stiffness: 200 } });

  return (
    <AbsoluteFill
      style={{
        background: BG,
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 배경 원형 glow */}
      <div style={{
        position: "absolute",
        right: -200, top: "50%",
        transform: "translateY(-50%)",
        width: 600, height: 600,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${YELLOW}18 0%, transparent 70%)`,
        opacity: interpolate(tenxSpring, [0, 1], [0, 1]),
      }} />

      {/* 태그 */}
      <div style={{
        opacity: interpolate(tagSpring, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(tagSpring, [0, 1], [20, 0])}px)`,
        fontSize: 12, letterSpacing: "0.3em", color: YELLOW,
        fontWeight: 700, textTransform: "uppercase", marginBottom: 32,
      }}>
        04 · AI NATIVE · 2026
      </div>

      {/* "The Era of" */}
      <WordReveal
        words={["The", "Era", "of"]}
        frame={frame}
        startDelay={5}
        interval={8}
        fontSize={72}
        color={WHITE}
        fontWeight={900}
      />

      {/* "10x LEVERAGE." */}
      <div style={{
        transform: `scale(${tenxScale})`,
        opacity: tenxOp,
        transformOrigin: "left center",
        fontSize: 100,
        fontWeight: 900,
        color: YELLOW,
        letterSpacing: "-0.04em",
        lineHeight: 1,
        marginTop: 8,
        marginBottom: 40,
      }}>
        10x Leverage.
      </div>

      {/* 바디 */}
      <div style={{
        opacity: interpolate(bodySpring, [0, 0.6], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(bodySpring, [0, 1], [24, 0])}px)`,
        fontSize: 18, color: "#666", lineHeight: 1.8, maxWidth: 640, marginBottom: 12,
      }}>
        The only thing AI will replace is the person who refuses to use it.
      </div>
      <div style={{
        opacity: interpolate(bodySpring, [0.3, 1], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(bodySpring, [0, 1], [24, 0])}px)`,
        fontSize: 18, color: WHITE, fontWeight: 600, lineHeight: 1.8, maxWidth: 640, marginBottom: 40,
      }}>
        Build your own 24/7 AI team. That is AI Native.
      </div>

      {/* CTA */}
      <div style={{
        opacity: interpolate(ctaSpring, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateX(${interpolate(ctaSpring, [0, 1], [-40, 0])}px)`,
        display: "inline-flex", alignItems: "center", gap: 14,
        border: `1px solid ${YELLOW}`, borderRadius: 4, padding: "16px 28px",
        width: "fit-content",
      }}>
        <span style={{ fontSize: 20, color: YELLOW }}>→</span>
        <span style={{ fontSize: 15, color: YELLOW, fontWeight: 700, letterSpacing: "0.04em" }}>
          Install Claude Code & Build Your AI Agent Team
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── 메인 ──
const SCENES = [SceneCash, SceneRevenue, SceneGoals, SceneAINative];

export const KineticVideo: React.FC = () => {
  const frame = useCurrentFrame();

  const sceneIndex = Math.min(Math.floor(frame / SCENE), SCENES.length - 1);
  const SceneComp = SCENES[sceneIndex];
  const localFrame = frame - sceneIndex * SCENE;

  // 씬 전환: 빠른 화이트 플래시
  const transitionProgress = frame % SCENE;
  const flashOpacity =
    transitionProgress < 4 && sceneIndex > 0
      ? interpolate(transitionProgress, [0, 4], [0.6, 0], { extrapolateRight: "clamp" })
      : 0;

  return (
    <AbsoluteFill style={{ background: BG }}>
      <SceneComp frame={localFrame} />
      {/* 전환 플래시 */}
      <AbsoluteFill
        style={{
          background: WHITE,
          opacity: flashOpacity,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
