# Claude Code 2026 Feature Video — Implementation Plan

**Goal:** Remotion으로 Claude Code 2026 최신 기능(Skills, Multi-Agent, MCP) 소개 영상 제작 (미디엄 90초 + 숏폼 35초)

**Architecture:** `TransitionSeries`로 Scene 간 전환, `Sequence`로 Scene 내부 시퀀싱. 터미널 시뮬레이션 컴포넌트(`Terminal`, `TypingText`)를 핵심 빌딩 블록으로, 5개 Scene이 이를 조합. 숏폼은 미디엄 Scene을 재사용하되 frame 범위만 조정.

**Tech Stack:** Remotion 4.x, React 18, TypeScript 5, @remotion/transitions, @remotion/google-fonts (JetBrains Mono + Noto Sans KR)

**Design Doc:** `docs/plans/2026-03-09-claude-code-video-design.md`

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `claude-code-video/package.json`
- Create: `claude-code-video/tsconfig.json`
- Create: `claude-code-video/remotion.config.ts`
- Create: `claude-code-video/src/index.ts`

**Step 1: 디렉토리 생성 및 package.json 작성**

```bash
mkdir -p claude-code-video/src
```

```json
{
  "name": "claude-code-video",
  "version": "1.0.0",
  "description": "Claude Code 2026 Feature Intro Video",
  "scripts": {
    "start": "npx remotion studio src/index.ts",
    "render:medium": "npx remotion render src/index.ts ClaudeCodeMedium out/claude-code-medium.mp4 --overwrite",
    "render:short": "npx remotion render src/index.ts ClaudeCodeShort out/claude-code-short.mp4 --overwrite",
    "render:all": "npm run render:medium && npm run render:short"
  },
  "dependencies": {
    "@remotion/cli": "^4.0.0",
    "@remotion/google-fonts": "^4.0.0",
    "@remotion/transitions": "^4.0.0",
    "remotion": "^4.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
```

**Step 2: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**Step 3: remotion.config.ts 작성**

```ts
import { Config } from "@remotion/cli/config";
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
```

**Step 4: src/index.ts 작성**

```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";
registerRoot(RemotionRoot);
```

**Step 5: 의존성 설치**

```bash
cd claude-code-video && npm install
```

**Step 6: 커밋**

```bash
git add claude-code-video/
git commit -m "feat(video): init claude-code-video Remotion project"
```

---

## Task 2: theme.ts + Root.tsx (Composition 등록)

**Files:**
- Create: `claude-code-video/src/theme.ts`
- Create: `claude-code-video/src/Root.tsx`

**Step 1: theme.ts 작성**

```ts
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadNotoSansKR } from "@remotion/google-fonts/NotoSansKR";

// Fonts
export const { fontFamily: MONO } = loadJetBrains("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

export const { fontFamily: SANS } = loadNotoSansKR("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});

// Colors — EO Brand
export const C = {
  bg: "#0A0A0A",
  terminal: "#111111",
  terminalBar: "#1A1A1A",
  accent: "#00E87A",
  white: "#FFFFFF",
  grey: "#888888",
  greyDark: "#444444",
  dimText: "#666666",
  red: "#FF4444",
  blue: "#4A9EFF",
  yellow: "#FFD93D",
} as const;

// Timing (frames @ 30fps)
export const FPS = 30;
export const CHAR_FRAMES = 2; // 타이핑 속도: 2프레임/글자
export const CURSOR_BLINK = 16; // 커서 깜빡임 주기
```

**Step 2: Root.tsx 작성 (Placeholder 컴포넌트)**

```tsx
import React from "react";
import { Composition, Folder } from "remotion";
import { AbsoluteFill } from "remotion";
import { FPS } from "./theme";

// Placeholder — 각 Scene 작성 후 교체
const Placeholder: React.FC = () => (
  <AbsoluteFill style={{ background: "#0A0A0A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div>Placeholder</div>
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Claude-Code-2026">
      <Composition
        id="ClaudeCodeMedium"
        component={Placeholder}
        durationInFrames={90 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ClaudeCodeShort"
        component={Placeholder}
        durationInFrames={35 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </Folder>
  );
};
```

**Step 3: Remotion Studio 실행 확인**

```bash
cd claude-code-video && npm start
```
Expected: 브라우저에 Remotion Studio 열림, Claude-Code-2026 폴더 안에 두 Composition 보임

**Step 4: 커밋**

```bash
git add claude-code-video/src/theme.ts claude-code-video/src/Root.tsx
git commit -m "feat(video): add theme + Root with Medium/Short compositions"
```

---

## Task 3: Terminal 컴포넌트

**Files:**
- Create: `claude-code-video/src/components/Terminal.tsx`

**Step 1: Terminal.tsx 작성**

macOS 스타일 터미널 프레임. children으로 터미널 내부 콘텐츠를 받음.

```tsx
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, MONO } from "../theme";

type TerminalProps = {
  children: React.ReactNode;
  title?: string;
  width?: string | number;
  height?: string | number;
};

export const Terminal: React.FC<TerminalProps> = ({
  children,
  title = "claude-code — zsh",
  width = "85%",
  height = "75%",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = interpolate(frame, [0, 0.3 * fps], [0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, 0.3 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width,
          height,
          background: C.terminal,
          borderRadius: 12,
          border: `1px solid #333`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transform: `scale(${scale})`,
          opacity,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Title Bar */}
        <div
          style={{
            height: 40,
            background: C.terminalBar,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 8,
            borderBottom: "1px solid #222",
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FEBC2E" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28C840" }} />
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 13,
              color: C.dimText,
              fontFamily: MONO,
            }}
          >
            {title}
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            padding: "20px 24px",
            fontFamily: MONO,
            fontSize: 18,
            lineHeight: 1.7,
            color: C.white,
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: 커밋**

```bash
git add claude-code-video/src/components/Terminal.tsx
git commit -m "feat(video): add Terminal component with macOS-style frame"
```

---

## Task 4: TypingText + OutputLine + Cursor 컴포넌트

**Files:**
- Create: `claude-code-video/src/components/TypingText.tsx`
- Create: `claude-code-video/src/components/OutputLine.tsx`

**Step 1: TypingText.tsx 작성**

Remotion best practice: string slicing으로 타이프라이터 효과, CSS animation 금지.

```tsx
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, MONO, CHAR_FRAMES, CURSOR_BLINK } from "../theme";

type TypingTextProps = {
  text: string;
  startFrame?: number;
  charFrames?: number;
  color?: string;
  prefix?: string;
  showCursor?: boolean;
  fontSize?: number;
};

export const TypingText: React.FC<TypingTextProps> = ({
  text,
  startFrame = 0,
  charFrames = CHAR_FRAMES,
  color = C.white,
  prefix = "",
  showCursor = true,
  fontSize = 18,
}) => {
  const frame = useCurrentFrame();
  const localFrame = Math.max(0, frame - startFrame);

  const typedChars = Math.min(text.length, Math.floor(localFrame / charFrames));
  const typedText = text.slice(0, typedChars);
  const isTyping = typedChars < text.length;
  const isDone = typedChars >= text.length;

  // 커서: 타이핑 중에는 항상 보임, 완료 후 깜빡임
  const cursorOpacity = isTyping
    ? 1
    : interpolate(
        frame % CURSOR_BLINK,
        [0, CURSOR_BLINK / 2, CURSOR_BLINK],
        [1, 0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );

  if (frame < startFrame) return null;

  return (
    <div style={{ fontFamily: MONO, fontSize, lineHeight: 1.7 }}>
      {prefix && <span style={{ color: C.accent }}>{prefix}</span>}
      <span style={{ color }}>{typedText}</span>
      {showCursor && (
        <span style={{ color: C.accent, opacity: cursorOpacity }}>{"\u258C"}</span>
      )}
    </div>
  );
};
```

**Step 2: OutputLine.tsx 작성**

```tsx
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "../theme";

type OutputLineProps = {
  text: string;
  startFrame: number;
  color?: string;
  icon?: string;
  fontSize?: number;
  indent?: number;
};

export const OutputLine: React.FC<OutputLineProps> = ({
  text,
  startFrame,
  color = C.grey,
  icon,
  fontSize = 18,
  indent = 0,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize,
        lineHeight: 1.7,
        color,
        opacity,
        paddingLeft: indent,
      }}
    >
      {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
      {text}
    </div>
  );
};
```

**Step 3: 커밋**

```bash
git add claude-code-video/src/components/TypingText.tsx claude-code-video/src/components/OutputLine.tsx
git commit -m "feat(video): add TypingText and OutputLine components"
```

---

## Task 5: Badge + GlitchTransition 컴포넌트

**Files:**
- Create: `claude-code-video/src/components/Badge.tsx`
- Create: `claude-code-video/src/components/GlitchTransition.tsx`

**Step 1: Badge.tsx 작성**

```tsx
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, SANS } from "../theme";

type BadgeProps = {
  number: string;
  label: string;
};

export const Badge: React.FC<BadgeProps> = ({ number, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const translateX = interpolate(frame, [0, 0.5 * fps], [-100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 40,
        left: 40,
        opacity,
        transform: `translateX(${translateX}px)`,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span
        style={{
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: 700,
          color: C.accent,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        {number}
      </span>
      <div style={{ width: 24, height: 1, background: C.accent }} />
      <span
        style={{
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: 700,
          color: C.white,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
};
```

**Step 2: GlitchTransition.tsx 작성**

`@remotion/transitions`의 커스텀 presentation으로 구현하지 않고, 단독 오버레이 컴포넌트로 만듦. TransitionSeries.Overlay에서 사용.

```tsx
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, random } from "remotion";
import { C } from "../theme";

export const GlitchTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const totalFrames = Math.round(0.5 * fps); // 0.5초

  const progress = interpolate(frame, [0, totalFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 글리치 강도: 중간이 가장 강함
  const intensity = Math.sin(progress * Math.PI);

  // RGB shift
  const shiftX = intensity * 20;

  // 노이즈 바
  const bars = Array.from({ length: 8 }, (_, i) => {
    const y = random(`bar-${frame}-${i}`) * height;
    const h = random(`barh-${frame}-${i}`) * 10 + 2;
    const x = random(`barx-${frame}-${i}`) * width * 0.3;
    return { y, h, x };
  });

  return (
    <AbsoluteFill>
      {/* Red channel shift */}
      <AbsoluteFill
        style={{
          backgroundColor: "rgba(255,0,0,0.08)",
          transform: `translateX(${shiftX}px)`,
          mixBlendMode: "screen",
        }}
      />
      {/* Cyan channel shift */}
      <AbsoluteFill
        style={{
          backgroundColor: "rgba(0,255,200,0.06)",
          transform: `translateX(${-shiftX}px)`,
          mixBlendMode: "screen",
        }}
      />
      {/* Noise bars */}
      {bars.map((bar, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: bar.y,
            left: bar.x,
            width: width - bar.x * 2,
            height: bar.h,
            background: `rgba(255,255,255,${intensity * 0.15})`,
          }}
        />
      ))}
      {/* Flash */}
      <AbsoluteFill
        style={{
          backgroundColor: C.accent,
          opacity: intensity > 0.9 ? 0.15 : 0,
        }}
      />
    </AbsoluteFill>
  );
};
```

**Step 3: 커밋**

```bash
git add claude-code-video/src/components/Badge.tsx claude-code-video/src/components/GlitchTransition.tsx
git commit -m "feat(video): add Badge and GlitchTransition components"
```

---

## Task 6: Intro Scene

**Files:**
- Create: `claude-code-video/src/scenes/Intro.tsx`

**Step 1: Intro.tsx 작성**

```tsx
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { C, MONO, SANS, CURSOR_BLINK } from "../theme";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: 커서 깜빡임 (0~1초)
  const cursorOnly = frame < 1 * fps;
  const cursorOpacity = interpolate(
    frame % CURSOR_BLINK,
    [0, CURSOR_BLINK / 2, CURSOR_BLINK],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Phase 2: "claude" 타이핑 (1~2.5초)
  const typeStart = 1 * fps;
  const typeText = "claude";
  const charFrames = 3;
  const typedChars = Math.min(
    typeText.length,
    Math.max(0, Math.floor((frame - typeStart) / charFrames))
  );
  const typed = typeText.slice(0, typedChars);
  const doneTyping = typedChars >= typeText.length;

  // Phase 3: 로고 확대 (3~5초)
  const logoStart = 3 * fps;
  const logoScale = interpolate(frame, [logoStart, logoStart + fps], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoOpacity = interpolate(frame, [logoStart, logoStart + 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 4: 서브타이틀 (5~7초)
  const subStart = 5 * fps;
  const subOpacity = interpolate(frame, [subStart, subStart + 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 5: 페이드아웃 (7~8초)
  const fadeOutStart = 7 * fps;
  const fadeOut = interpolate(frame, [fadeOutStart, fadeOutStart + fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut,
      }}
    >
      {/* 터미널 프롬프트 단계 */}
      {frame < logoStart && (
        <div style={{ fontFamily: MONO, fontSize: 48, color: C.accent }}>
          <span style={{ color: C.dimText }}>{">"} </span>
          <span>{typed}</span>
          <span style={{ opacity: cursorOpacity }}>{"\u258C"}</span>
        </div>
      )}

      {/* 로고 단계 */}
      {frame >= logoStart && (
        <>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 72,
              fontWeight: 900,
              color: C.white,
              letterSpacing: "-0.02em",
              opacity: logoOpacity,
              transform: `scale(${logoScale})`,
            }}
          >
            Claude Code
          </div>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 24,
              color: C.accent,
              marginTop: 16,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              opacity: subOpacity,
            }}
          >
            The AI-Native CLI — 2026
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};
```

**Step 2: 커밋**

```bash
git add claude-code-video/src/scenes/Intro.tsx
git commit -m "feat(video): add Intro scene with typing + logo animation"
```

---

## Task 7: SkillsDemo Scene

**Files:**
- Create: `claude-code-video/src/scenes/SkillsDemo.tsx`

**Step 1: SkillsDemo.tsx 작성**

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Sequence } from "remotion";
import { C } from "../theme";
import { Terminal } from "../components/Terminal";
import { TypingText } from "../components/TypingText";
import { OutputLine } from "../components/OutputLine";
import { Badge } from "../components/Badge";

export const SkillsDemo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Badge number="01" label="Skills" />

      <Sequence from={Math.round(0.5 * fps)} premountFor={fps}>
        <Terminal title="~/project — claude-code">
          {/* /commit 타이핑 */}
          <TypingText
            text="/commit"
            prefix="$ "
            startFrame={0}
            color={C.accent}
          />

          {/* 결과 출력 */}
          <OutputLine text="Analyzing changes..." icon="🔍" startFrame={Math.round(2 * fps)} color={C.grey} />
          <OutputLine text="  M  src/api/auth.ts" startFrame={Math.round(3 * fps)} color={C.dimText} indent={16} />
          <OutputLine text="  M  src/utils/validate.ts" startFrame={Math.round(3.3 * fps)} color={C.dimText} indent={16} />
          <OutputLine text="Drafting commit message..." icon="📝" startFrame={Math.round(4.5 * fps)} color={C.grey} />
          <OutputLine
            text="✓ feat: add OAuth2 token refresh logic"
            startFrame={Math.round(6 * fps)}
            color={C.accent}
          />
          <OutputLine
            text="✓ Committed & pushed to origin/main"
            startFrame={Math.round(7.5 * fps)}
            color={C.accent}
          />
        </Terminal>
      </Sequence>

      {/* 하단 캡션 */}
      <Sequence from={Math.round(8.5 * fps)} layout="none" premountFor={fps}>
        <Caption text="한 줄 명령 → 분석 → 커밋 → 푸시 자동화" />
      </Sequence>
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const opacity = Math.min(1, frame / (0.5 * fps));

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        width: "100%",
        textAlign: "center",
        fontFamily: "'Noto Sans KR', sans-serif",
        fontSize: 22,
        color: C.white,
        opacity,
        letterSpacing: "0.05em",
      }}
    >
      {text}
    </div>
  );
};
```

**Step 2: 커밋**

```bash
git add claude-code-video/src/scenes/SkillsDemo.tsx
git commit -m "feat(video): add SkillsDemo scene — /commit demo"
```

---

## Task 8: MultiAgentDemo Scene

**Files:**
- Create: `claude-code-video/src/scenes/MultiAgentDemo.tsx`

**Step 1: MultiAgentDemo.tsx 작성**

핵심: 터미널 → 3분할 → 병렬 진행바 → 합쳐짐

```tsx
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { C, MONO, SANS } from "../theme";
import { Terminal } from "../components/Terminal";
import { TypingText } from "../components/TypingText";
import { OutputLine } from "../components/OutputLine";
import { Badge } from "../components/Badge";

const AGENTS = [
  { name: "Agent 1", file: "auth.ts", speed: 0.9 },
  { name: "Agent 2", file: "validate.ts", speed: 1.0 },
  { name: "Agent 3", file: "api-client.ts", speed: 0.75 },
];

const ProgressBar: React.FC<{
  progress: number;
  label: string;
  file: string;
  done: boolean;
}> = ({ progress, label, file, done }) => (
  <div style={{ flex: 1, padding: "12px 16px" }}>
    <div style={{ fontFamily: MONO, fontSize: 13, color: C.accent, marginBottom: 6 }}>
      {label} → {file}
    </div>
    <div
      style={{
        height: 6,
        background: "#222",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(100, progress)}%`,
          height: "100%",
          background: done ? C.accent : C.blue,
          borderRadius: 3,
        }}
      />
    </div>
    {done && (
      <div style={{ fontFamily: MONO, fontSize: 14, color: C.accent, marginTop: 6 }}>
        ✓ Complete
      </div>
    )}
  </div>
);

export const MultiAgentDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 3분할 시작 (4초) → 완료 (12초)
  const splitStart = 4 * fps;
  const splitProgress = interpolate(frame, [splitStart, splitStart + 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 합쳐짐 (14초)
  const mergeStart = 14 * fps;
  const mergeProgress = interpolate(frame, [mergeStart, mergeStart + 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isSplit = frame >= splitStart && frame < mergeStart;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Badge number="02" label="Multi-Agent" />

      {/* Phase 1: 명령 입력 */}
      {frame < splitStart && (
        <Sequence from={Math.round(0.5 * fps)} premountFor={fps}>
          <Terminal title="~/project — claude-code">
            <TypingText
              text="이 3개 파일 동시에 리팩터링해줘"
              prefix="$ "
              startFrame={0}
              charFrames={2}
            />
            <OutputLine
              text="Spawning 3 agents..."
              icon="⚡"
              startFrame={Math.round(2.5 * fps)}
              color={C.yellow}
            />
          </Terminal>
        </Sequence>
      )}

      {/* Phase 2: 3분할 병렬 작업 */}
      {isSplit && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 40px",
            gap: 12,
            opacity: splitProgress,
          }}
        >
          {AGENTS.map((agent, i) => {
            const agentFrame = frame - splitStart;
            const progress = Math.min(100, (agentFrame / (8 * fps)) * 100 * agent.speed);
            const done = progress >= 100;

            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: C.terminal,
                  border: `1px solid ${done ? C.accent : "#333"}`,
                  borderRadius: 8,
                  height: "60%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <ProgressBar
                  progress={progress}
                  label={agent.name}
                  file={agent.file}
                  done={done}
                />
              </div>
            );
          })}
        </AbsoluteFill>
      )}

      {/* Phase 3: 합쳐진 후 결과 */}
      {frame >= mergeStart && (
        <Sequence from={0} premountFor={fps}>
          <Terminal title="~/project — claude-code">
            <OutputLine
              text="✓ 3 files refactored in 12s"
              startFrame={0}
              color={C.accent}
              icon=""
            />
          </Terminal>
        </Sequence>
      )}

      {/* 캡션 */}
      {frame >= 15 * fps && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            width: "100%",
            textAlign: "center",
            fontFamily: SANS,
            fontSize: 22,
            color: C.white,
            opacity: interpolate(frame, [15 * fps, 15.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          병렬 실행 — 3배 빠른 작업
        </div>
      )}
    </AbsoluteFill>
  );
};
```

**Step 2: 커밋**

```bash
git add claude-code-video/src/scenes/MultiAgentDemo.tsx
git commit -m "feat(video): add MultiAgentDemo scene — 3-way split animation"
```

---

## Task 9: McpDemo Scene

**Files:**
- Create: `claude-code-video/src/scenes/McpDemo.tsx`

**Step 1: McpDemo.tsx 작성**

```tsx
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { C, MONO, SANS } from "../theme";
import { Terminal } from "../components/Terminal";
import { TypingText } from "../components/TypingText";
import { OutputLine } from "../components/OutputLine";
import { Badge } from "../components/Badge";

const ServiceIcon: React.FC<{
  name: string;
  color: string;
  startFrame: number;
  x: "left" | "right";
}> = ({ name, color, startFrame, x }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [startFrame, startFrame + 0.3 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [startFrame, startFrame + 0.3 * fps], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        [x]: 60,
        top: "50%",
        transform: `translateY(-50%) scale(${scale})`,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
        }}
      >
        {name === "Slack" ? "💬" : "📄"}
      </div>
      <span style={{ fontFamily: MONO, fontSize: 14, color: C.white }}>{name}</span>
    </div>
  );
};

export const McpDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Badge number="03" label="MCP Integration" />

      <Sequence from={Math.round(0.5 * fps)} premountFor={fps}>
        <Terminal title="~/project — claude-code" width="65%">
          <TypingText
            text="오늘 회의 내용 Slack에 공유하고 Notion에 정리해"
            prefix="$ "
            startFrame={0}
            charFrames={2}
          />
          <OutputLine
            text="Connected: Slack, Notion"
            icon="🔌"
            startFrame={Math.round(3.5 * fps)}
            color={C.blue}
          />
          <OutputLine
            text="✓ Slack #general — 회의록 전송 완료"
            startFrame={Math.round(6 * fps)}
            color={C.accent}
          />
          <OutputLine
            text="✓ Notion — 회의록 페이지 생성 완료"
            startFrame={Math.round(9 * fps)}
            color={C.accent}
          />
        </Terminal>
      </Sequence>

      {/* Slack 아이콘 */}
      <ServiceIcon name="Slack" color="#4A154B" startFrame={Math.round(5 * fps)} x="left" />

      {/* Notion 아이콘 */}
      <ServiceIcon name="Notion" color="#191919" startFrame={Math.round(8 * fps)} x="right" />

      {/* 캡션 */}
      {frame >= 11 * fps && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            width: "100%",
            textAlign: "center",
            fontFamily: SANS,
            fontSize: 22,
            color: C.white,
            opacity: interpolate(frame, [11 * fps, 11.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          터미널 하나로 모든 도구를 연결
        </div>
      )}
    </AbsoluteFill>
  );
};
```

**Step 2: 커밋**

```bash
git add claude-code-video/src/scenes/McpDemo.tsx
git commit -m "feat(video): add McpDemo scene — Slack + Notion integration"
```

---

## Task 10: Outro Scene

**Files:**
- Create: `claude-code-video/src/scenes/Outro.tsx`

**Step 1: Outro.tsx 작성**

```tsx
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, SANS, MONO } from "../theme";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleScale = interpolate(frame, [0, 0.5 * fps], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subOpacity = interpolate(frame, [fps, 1.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoOpacity = interpolate(frame, [2 * fps, 2.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [5 * fps, 6 * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 80,
          fontWeight: 900,
          color: C.white,
          letterSpacing: "-0.02em",
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
        }}
      >
        Claude Code
      </div>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 24,
          color: C.accent,
          marginTop: 16,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          opacity: subOpacity,
        }}
      >
        The AI-Native CLI
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 14,
          color: C.dimText,
          marginTop: 48,
          opacity: logoOpacity,
        }}
      >
        EO Studio · Built with Remotion
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: 커밋**

```bash
git add claude-code-video/src/scenes/Outro.tsx
git commit -m "feat(video): add Outro scene — title + CTA + logo"
```

---

## Task 11: MediumVideo 조합 (TransitionSeries)

**Files:**
- Create: `claude-code-video/src/MediumVideo.tsx`

**Step 1: MediumVideo.tsx 작성**

`@remotion/transitions`의 `TransitionSeries`를 사용하여 Glitch 오버레이와 함께 Scene 연결.

```tsx
import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { C } from "./theme";
import { Intro } from "./scenes/Intro";
import { SkillsDemo } from "./scenes/SkillsDemo";
import { MultiAgentDemo } from "./scenes/MultiAgentDemo";
import { McpDemo } from "./scenes/McpDemo";
import { Outro } from "./scenes/Outro";
import { GlitchTransition } from "./components/GlitchTransition";

const FPS = 30;
const GLITCH = Math.round(0.5 * FPS); // 15 frames

export const MediumVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <TransitionSeries>
        {/* Intro: 8초 */}
        <TransitionSeries.Sequence durationInFrames={8 * FPS}>
          <Intro />
        </TransitionSeries.Sequence>

        <TransitionSeries.Overlay durationInFrames={GLITCH}>
          <GlitchTransition />
        </TransitionSeries.Overlay>

        {/* Skills Demo: 25초 */}
        <TransitionSeries.Sequence durationInFrames={25 * FPS}>
          <SkillsDemo />
        </TransitionSeries.Sequence>

        <TransitionSeries.Overlay durationInFrames={GLITCH}>
          <GlitchTransition />
        </TransitionSeries.Overlay>

        {/* Multi-Agent Demo: 25초 */}
        <TransitionSeries.Sequence durationInFrames={25 * FPS}>
          <MultiAgentDemo />
        </TransitionSeries.Sequence>

        <TransitionSeries.Overlay durationInFrames={GLITCH}>
          <GlitchTransition />
        </TransitionSeries.Overlay>

        {/* MCP Demo: 25초 */}
        <TransitionSeries.Sequence durationInFrames={25 * FPS}>
          <McpDemo />
        </TransitionSeries.Sequence>

        <TransitionSeries.Overlay durationInFrames={GLITCH}>
          <GlitchTransition />
        </TransitionSeries.Overlay>

        {/* Outro: 7초 */}
        <TransitionSeries.Sequence durationInFrames={7 * FPS}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
```

**Step 2: 커밋**

```bash
git add claude-code-video/src/MediumVideo.tsx
git commit -m "feat(video): add MediumVideo with TransitionSeries + GlitchOverlay"
```

---

## Task 12: ShortVideo (9:16 숏폼)

**Files:**
- Create: `claude-code-video/src/ShortVideo.tsx`

**Step 1: ShortVideo.tsx 작성**

미디엄 Scene을 재사용하되, 각 Scene에서 핵심 부분만 추출 (Sequence + durationInFrames 조절).

```tsx
import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { C } from "./theme";
import { Intro } from "./scenes/Intro";
import { SkillsDemo } from "./scenes/SkillsDemo";
import { MultiAgentDemo } from "./scenes/MultiAgentDemo";
import { McpDemo } from "./scenes/McpDemo";
import { Outro } from "./scenes/Outro";
import { GlitchTransition } from "./components/GlitchTransition";

const FPS = 30;
const GLITCH = Math.round(0.3 * FPS); // 9 frames (더 빠른 전환)

export const ShortVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <TransitionSeries>
        {/* Intro: 3초 */}
        <TransitionSeries.Sequence durationInFrames={3 * FPS}>
          <Intro />
        </TransitionSeries.Sequence>

        <TransitionSeries.Overlay durationInFrames={GLITCH}>
          <GlitchTransition />
        </TransitionSeries.Overlay>

        {/* Skills: 8초 */}
        <TransitionSeries.Sequence durationInFrames={8 * FPS}>
          <SkillsDemo />
        </TransitionSeries.Sequence>

        <TransitionSeries.Overlay durationInFrames={GLITCH}>
          <GlitchTransition />
        </TransitionSeries.Overlay>

        {/* Multi-Agent: 8초 */}
        <TransitionSeries.Sequence durationInFrames={8 * FPS}>
          <MultiAgentDemo />
        </TransitionSeries.Sequence>

        <TransitionSeries.Overlay durationInFrames={GLITCH}>
          <GlitchTransition />
        </TransitionSeries.Overlay>

        {/* MCP: 8초 */}
        <TransitionSeries.Sequence durationInFrames={8 * FPS}>
          <McpDemo />
        </TransitionSeries.Sequence>

        <TransitionSeries.Overlay durationInFrames={GLITCH}>
          <GlitchTransition />
        </TransitionSeries.Overlay>

        {/* Outro: 4초 */}
        <TransitionSeries.Sequence durationInFrames={4 * FPS}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
```

**Step 2: 커밋**

```bash
git add claude-code-video/src/ShortVideo.tsx
git commit -m "feat(video): add ShortVideo — 35s vertical cut"
```

---

## Task 13: Root.tsx 완성 + Remotion Studio 검증

**Files:**
- Modify: `claude-code-video/src/Root.tsx`

**Step 1: Root.tsx에서 Placeholder를 실제 컴포넌트로 교체**

```tsx
import React from "react";
import { Composition, Folder } from "remotion";
import { FPS } from "./theme";
import { MediumVideo } from "./MediumVideo";
import { ShortVideo } from "./ShortVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Claude-Code-2026">
      <Composition
        id="ClaudeCodeMedium"
        component={MediumVideo}
        durationInFrames={90 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ClaudeCodeShort"
        component={ShortVideo}
        durationInFrames={35 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </Folder>
  );
};
```

**Step 2: Remotion Studio에서 두 Composition 모두 확인**

```bash
cd claude-code-video && npm start
```
Expected:
- ClaudeCodeMedium: 1920×1080, 90초, 5개 Scene이 Glitch로 전환되며 재생
- ClaudeCodeShort: 1080×1920, 35초, 빠른 전환

**Step 3: 커밋**

```bash
git add claude-code-video/src/Root.tsx
git commit -m "feat(video): wire up Root.tsx with MediumVideo + ShortVideo"
```

---

## Task 14: 렌더링 + 최종 확인

**Step 1: 미디엄 렌더링**

```bash
cd claude-code-video && npm run render:medium
```
Expected: `out/claude-code-medium.mp4` 생성 (~90초, 1920×1080)

**Step 2: 숏폼 렌더링**

```bash
cd claude-code-video && npm run render:short
```
Expected: `out/claude-code-short.mp4` 생성 (~35초, 1080×1920)

**Step 3: 영상 확인 후 최종 커밋**

```bash
git add -A claude-code-video/
git commit -m "feat(video): complete Claude Code 2026 feature video — medium + short"
```

---

## Summary

| Task | 내용 | 예상 |
|------|------|------|
| 1 | 프로젝트 초기화 | 5분 |
| 2 | theme.ts + Root.tsx | 5분 |
| 3 | Terminal 컴포넌트 | 5분 |
| 4 | TypingText + OutputLine | 5분 |
| 5 | Badge + GlitchTransition | 5분 |
| 6 | Intro Scene | 5분 |
| 7 | SkillsDemo Scene | 5분 |
| 8 | MultiAgentDemo Scene | 10분 |
| 9 | McpDemo Scene | 5분 |
| 10 | Outro Scene | 3분 |
| 11 | MediumVideo 조합 | 3분 |
| 12 | ShortVideo 조합 | 3분 |
| 13 | Root.tsx 완성 + Studio 검증 | 5분 |
| 14 | 렌더링 + 최종 확인 | 10분 |
