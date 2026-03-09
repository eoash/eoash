# Claude Code 2026 Feature Video — Design Document

> 2026-03-09 | Brainstorming → Approved

## Overview

Claude Code 2026 최신 기능을 소개하는 Remotion 기반 프로모션 영상.
외부 공유용 (YouTube, LinkedIn, Instagram Reels/Shorts).

## Target & Purpose

- **타겟**: 개발자, AI 관심층, 잠재 사용자
- **목적**: Claude Code가 단순 코드 생성을 넘어 "AI Operating System"임을 전달
- **톤**: 다크 테크 (EO 브랜드 #0A0A0A + #00E87A)

## Features (Top 3)

1. **Skills** — `/slash-command` 한 줄로 복잡한 워크플로우 실행
2. **Multi-Agent** — 하나의 명령 → 여러 에이전트 동시 병렬 작업
3. **MCP Integration** — CLI에서 Slack·Notion·Gmail 직접 조작

## Deliverables

| 버전 | 길이 | 해상도 | 용도 |
|------|------|--------|------|
| Medium | ~90초 (2700f @30fps) | 1920×1080 (16:9) | YouTube, LinkedIn |
| Short | ~35초 (1050f @30fps) | 1080×1920 (9:16) | Reels, Shorts |

## Visual Approach

**터미널 시뮬레이션** — 실제 터미널을 Remotion으로 재현, 타이핑 애니메이션으로 기능 데모

- macOS 스타일 터미널 창 (3-dot 타이틀바)
- 타이핑 애니메이션 + #00E87A 커서 깜빡임
- 기능 간 전환: Glitch 효과 (RGB split + noise, 1초)

## Project Structure

```
claude-code-video/
├── package.json
├── remotion.config.ts
├── src/
│   ├── index.ts
│   ├── Root.tsx                  # Composition (Medium + Short)
│   ├── MediumVideo.tsx           # 90초 풀 버전
│   ├── ShortVideo.tsx            # 35초 숏폼
│   ├── theme.ts                  # 색상, 폰트, 상수
│   ├── components/
│   │   ├── Terminal.tsx           # 터미널 프레임
│   │   ├── TypingText.tsx         # 타이핑 애니메이션
│   │   ├── OutputLine.tsx         # 결과 라인
│   │   ├── GlitchTransition.tsx   # 전환 효과
│   │   ├── Logo.tsx               # 로고
│   │   └── Badge.tsx              # 기능 라벨 뱃지
│   └── scenes/
│       ├── Intro.tsx
│       ├── SkillsDemo.tsx
│       ├── MultiAgentDemo.tsx
│       ├── McpDemo.tsx
│       └── Outro.tsx
```

## Scene Breakdown (Medium)

### Intro (0~8s / 0~240f)
- [0s] 검은 화면
- [1s] ">" 커서 깜빡임
- [2s] 타이핑: "claude" (#00E87A)
- [3s] 엔터 → Claude Code 로고 확대
- [5s] 서브타이틀: "The AI-Native CLI — 2026"
- [7s] 페이드아웃

### Feature 1: Skills (8~33s / 240~990f)
- 뱃지 "01 — SKILLS" 슬라이드인
- 터미널: `/commit` 타이핑
- 출력: 변경 분석 → 커밋 메시지 생성 → 푸시 완료
- 캡션: "한 줄 명령 → 분석 → 커밋 → 푸시 자동화"
- Glitch 전환

### Feature 2: Multi-Agent (33~58s / 990~1740f)
- 뱃지 "02 — MULTI-AGENT"
- 타이핑: "이 3개 파일 동시에 리팩터링해줘"
- 터미널 3분할 애니메이션 → 각 에이전트 병렬 진행
- 순차 완료 → 단일 터미널로 합침
- 캡션: "병렬 실행 — 3배 빠른 작업"
- Glitch 전환

### Feature 3: MCP (58~83s / 1740~2490f)
- 뱃지 "03 — MCP INTEGRATION"
- 타이핑: "오늘 회의 내용 Slack에 공유하고 Notion에 정리해"
- Slack 전송 + Notion 페이지 생성 애니메이션
- 캡션: "터미널 하나로 모든 도구를 연결"
- Glitch 전환

### Outro (83~90s / 2490~2700f)
- "Claude Code" 큰 텍스트
- "The AI-Native CLI" 서브타이틀
- EO Studio 로고
- 페이드아웃

## Short Version (35s)
Medium의 각 scene을 재사용, 기능당 핵심 5초 + 빠른 전환
- 9:16 세로 비율 (1080×1920)
- 인트로 3초, 기능별 8초, 아웃트로 4초

## Tech Stack
- Remotion 4.x
- React 18 + TypeScript 5
- Google Fonts (JetBrains Mono for terminal)
- EO Brand: #0A0A0A background, #00E87A accent
