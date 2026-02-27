import React from "react";
import { Composition } from "remotion";
import { TownhallVideo } from "./TownhallVideo";
import { KineticVideo } from "./KineticVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 슬라이드형 (25초) */}
      <Composition
        id="TownhallFinance"
        component={TownhallVideo}
        durationInFrames={750}
        fps={30}
        width={1280}
        height={720}
      />
      {/* 키네틱 타이포그래피 (12초) */}
      <Composition
        id="TownhallKinetic"
        component={KineticVideo}
        durationInFrames={360}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
