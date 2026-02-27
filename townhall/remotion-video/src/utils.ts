import { interpolate, Easing } from "remotion";

export const C = {
  bg: "#0A0A0A",
  yellow: "#E8FF47",
  white: "#FFFFFF",
  red: "#FF2D55",
  green: "#0AFF6C",
  grey: "#666666",
  greyDark: "#444444",
  cardBg: "#141414",
  cardBorder: "#1E1E1E",
  divider: "#222222",
  dividerLight: "#1A1A1A",
};

export const fadeIn = (frame: number, delay: number, dur = 20): number =>
  interpolate(frame, [delay, delay + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const expandW = (frame: number, delay: number, dur = 25): string =>
  `${interpolate(frame, [delay, delay + dur], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  })}%`;

export const countUp = (
  frame: number,
  delay: number,
  dur: number,
  target: number
): number =>
  interpolate(frame, [delay, delay + dur], [0, target], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
