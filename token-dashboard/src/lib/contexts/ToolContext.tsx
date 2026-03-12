"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type ToolType = "all" | "claude" | "codex" | "gemini";

const STORAGE_KEY = "tool-selection";

interface ToolContextValue {
  tool: ToolType;
  setTool: (t: ToolType) => void;
}

const ToolContext = createContext<ToolContextValue>({
  tool: "claude",
  setTool: () => {},
});

export function ToolProvider({ children }: { children: ReactNode }) {
  const [tool, setToolState] = useState<ToolType>("claude");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ["all", "claude", "codex", "gemini"].includes(saved)) {
      setToolState(saved as ToolType);
    }
    setHydrated(true);
  }, []);

  const setTool = (t: ToolType) => {
    setToolState(t);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, t);
    }
  };

  return (
    <ToolContext.Provider value={{ tool: hydrated ? tool : "claude", setTool }}>
      {children}
    </ToolContext.Provider>
  );
}

export function useTool() {
  return useContext(ToolContext);
}

/** 활동 지표(sessions, commits, PRs) 지원 여부 — Gemini는 미지원 */
export function toolHasActivity(tool: ToolType): boolean {
  return tool !== "gemini";
}

/** Claude 데이터 포함 여부 — gamification/XP/인사이트용 */
export function toolHasClaude(tool: ToolType): boolean {
  return tool === "claude" || tool === "all";
}

/** Tool brand colors */
export const TOOL_COLORS: Record<ToolType, string> = {
  all: "#00E87A",
  claude: "#E8FF47",
  codex: "#10A37F",
  gemini: "#4285F4",
};

export const TOOL_LABELS: Record<ToolType, string> = {
  all: "All",
  claude: "Claude",
  codex: "Codex",
  gemini: "Gemini",
};
