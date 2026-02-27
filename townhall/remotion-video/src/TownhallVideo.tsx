import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Slide1_Cash } from "./slides/Slide1_Cash";
import { Slide2_Revenue } from "./slides/Slide2_Revenue";
import { Slide3_Goals } from "./slides/Slide3_Goals";
import { Slide4_AINative } from "./slides/Slide4_AINative";

// 각 슬라이드 7초(210f), 전환 1초(30f)
// Total = 4 * 210 - 3 * 30 = 750 frames = 25초
const SLIDE_DUR = 210;
const TRANS = 30;
const STEP = SLIDE_DUR - TRANS; // 180

const slides = [Slide1_Cash, Slide2_Revenue, Slide3_Goals, Slide4_AINative];

export const TownhallVideo: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: "#0A0A0A" }}>
      {slides.map((SlideComp, i) => {
        const start = i * STEP;
        const end = start + SLIDE_DUR;
        const isLast = i === slides.length - 1;

        const opacity = isLast
          ? interpolate(frame, [start, start + TRANS], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          : interpolate(
              frame,
              [start, start + TRANS, end - TRANS, end],
              [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

        const localFrame = Math.max(0, frame - start);

        return (
          <AbsoluteFill key={i} style={{ opacity }}>
            <SlideComp frame={localFrame} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
