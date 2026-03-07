# EO Studio — AI Token Dashboard

EO Studio 팀의 AI 코딩 도구 사용량을 실시간으로 모니터링하는 내부 대시보드입니다.
Claude Code / Gemini / ChatGPT 사용 현황을 팀원별·모델별·기간별로 추적합니다.

**Live →** https://token-dashboard-iota.vercel.app
**Repository →** https://github.com/eoash/token-dashboard

---

## 스크린샷

| Overview | Leaderboard |
|----------|-------------|
| KPI 카드, 일별 차트, 모델 파이 | 팀원 순위, 기간 필터, 비용 추이 |

---

## 주요 기능

### Overview (`/`)
- **사용량 KPI**: 총 토큰, 캐시 히트율, 활성 사용자
- **생산성 KPI**: 일평균 세션, 커밋 수, PR 수
- **Top 3 Contributors**: 메달 카드 (골드/실버/브론즈)
- **일별 사용량 차트**: Input / Output / Cache 스택 영역 차트
- **모델별 파이 차트**: Opus / Sonnet / Haiku 비율

### Developer Leaderboard (`/leaderboard`)
- **AI 도구 탭**: Claude Code / Gemini / ChatGPT 전환
- **기간 필터**: Today / 7 Days / 30 Days / All Time (Claude Code만)
- **메트릭 토글**: Cost($) / Tokens 전환
- **컬럼**: 순위, 팀원, Input, Output, Cache, Total, SINCE(시작일), 추이(↑↓)
- **막대그래프**: 상위 3명 골드 하이라이트 + 평균선 + 하위 opacity 50%
- **Slack 프로필 사진 아바타** 표시
- **30초 자동 갱신** (Claude Code)

### Members (`/members`)
- 팀원 선택 드롭다운
- 개인별 KPI: 토큰, 비용, 세션, 커밋, PR
- **Started 카드**: 첫 사용일(firstSeen) 표시
- 일별 사용 차트 + 모델 사용 비율

### Models (`/models`)
- 모델별 토큰/비용 집계 테이블
- 모델별 비용 추이 차트

### Utilization (`/utilization`)
- 토큰 사용량 추이 차트
- 팀원별·모델별 사용 분포

### Efficiency (`/efficiency`)
- **캐시 히트율 추이**: 팀 전체 cache read / total input 비율
- **모델별 비용 효율**: 토큰당 비용 비교
- **세션당 생산성**: 세션별 평균 토큰·커밋·PR
- **팀원별 효율 테이블**: 캐시율, 비용효율, 세션생산성 비교
- **InfoTip 컴포넌트**: 차트·테이블 헤더에 설명 tooltip

---

## Mock 모드

`PROMETHEUS_URL` 환경변수가 없으면 자동으로 Mock 모드로 전환됩니다.

| 도구 | 데이터 출처 |
|------|------------|
| Claude Code | `src/lib/mock-data.ts` — 5명 × 30일 시뮬레이션 |
| Gemini | `src/lib/mock-ai-tools.ts` — 팀원별 고정 샘플 |
| ChatGPT | `src/lib/mock-ai-tools.ts` — 팀원별 고정 샘플 |

---

## 팀원 설정 (Claude Code 사용량 수집)

대시보드에 **실제 사용량 데이터**를 표시하려면 Claude Code를 사용하는 팀원 각자가 아래 설정을 한 번만 실행해야 합니다.

> **왜 필요한가요?**
> Claude Code는 기본적으로 사용량 데이터를 외부로 전송하지 않습니다.
> 아래 설정을 하면 팀의 OTel Collector로 텔레메트리가 전송되고, 대시보드에 반영됩니다.

### 설치 방법 (1분)

터미널을 열고 아래 명령어를 복사-붙여넣기 후 엔터:

```bash
curl -sL https://raw.githubusercontent.com/eoash/token-dashboard/main/scripts/install-hook.sh | bash
```

- Claude Code 세션이 끝날 때마다 사용량이 자동 수집됩니다
- 과거 사용 기록도 자동으로 backfill됩니다
- hook은 매 실행마다 최신 버전으로 자동 업데이트됩니다
- GitHub 계정 불필요, python3/curl/git만 있으면 OK

### 주의사항

- **Claude Code를 사용하는 팀원만** 설정하면 됩니다
- 설정 후 데이터가 대시보드에 반영되기까지 최대 **15분** 소요될 수 있습니다
- 설정 제거: `rm ~/.claude/hooks/otel_push.py` 후 `~/.claude/settings.json`에서 Stop hook 항목 삭제

---

## 시작하기

### 1. 클론 및 설치

```bash
git clone https://github.com/eoash/token-dashboard.git
cd token-dashboard
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local`에 아래 키를 입력합니다:

```env
# Prometheus URL (Railway에 배포된 Prometheus)
# 없으면 Mock 모드로 자동 동작
PROMETHEUS_URL=https://prometheus-production-ae90.up.railway.app
```

### 3. 로컬 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

---

## 팀원 추가 / 수정

`src/lib/constants.ts`의 `TEAM_MEMBERS`에서 팀원 목록을 관리합니다:

```ts
export const TEAM_MEMBERS: TeamMember[] = [
  { email: "ash@eoeoeo.net", name: "Seohyun" },
  { email: "ash@eostudio.tv", name: "Seohyun" },  // 같은 사람 복수 이메일 가능
  { email: "jay@eostudio.tv", name: "Jay" },
  // 여기에 추가
];
```

> - 이메일은 Claude Code에 로그인한 이메일과 일치해야 합니다
> - 같은 사람이 여러 이메일을 쓰면 같은 `name`으로 여러 줄 추가 → 자동 합산
> - 팀원 추가 시 **이메일 등록 + 해당 팀원 머신에 `install-hook.sh` 실행** 둘 다 필요

---

## 모델 추가

`src/lib/constants.ts`의 `MODEL_CONFIG`에 새 모델을 추가합니다:

```ts
export const MODEL_CONFIG: Record<string, ModelConfig> = {
  "claude-opus-4-6":           { label: "Opus 4.6",   color: "#E8FF47", inputPricePerMillion: 15,   outputPricePerMillion: 75   },
  "claude-sonnet-4-6":         { label: "Sonnet 4.6", color: "#3B82F6", inputPricePerMillion: 3,    outputPricePerMillion: 15   },
  "claude-haiku-4-5-20251001": { label: "Haiku 4.5",  color: "#10B981", inputPricePerMillion: 0.25, outputPricePerMillion: 1.25 },
  // 새 모델 추가 시 여기에 입력
};
```

---

## 데이터 수집 기준

대시보드의 데이터는 두 가지 소스에서 구간을 나누어 표시됩니다.

| 구간 | 데이터 소스 | 설명 |
|------|-----------|------|
| ~유저별 cutoff | **Backfill JSON** (`src/lib/backfill/*.json`) | `install-hook.sh` 실행 시 로컬 transcript를 파싱하여 생성. 날짜·모델별 정확한 데이터 |
| cutoff 이후~ | **Prometheus 실시간** | OTel Collector → Prometheus 파이프라인. 세션 종료 시 hook이 자동 전송 |

### 유저별 자동 cutoff

각 유저의 backfill JSON에서 `max(date)`를 자동 계산하여 cutoff 기준으로 사용합니다. 글로벌 `BACKFILL_END` 환경변수는 불필요합니다.

- 유저 A의 backfill이 3/7까지 있으면 → 3/7 이전은 JSON, 3/8부터는 Prometheus
- 유저 B가 3/10에 설치하면 → 3/10까지 JSON, 3/11부터 Prometheus
- backfill이 없는 유저는 → 전구간 Prometheus

### 추적 메트릭

| 메트릭 | 수집 방법 | 비고 |
|--------|----------|------|
| Tokens (input/output/cache) | transcript JSONL 파싱 | 모델별 정확한 usage |
| Commits | transcript에서 `git commit` 명령 감지 | Bash tool_use 파싱 |
| Pull Requests | transcript에서 `gh pr create` 명령 감지 | Bash tool_use 파싱 |
| Sessions | otel_push.py 1회 실행 = 1세션 | Stop hook 트리거 |
| First Seen | backfill JSON의 최소 날짜 | Members·Leaderboard에 표시 |

> **추적 불가 (숨김 처리):** Accepted Lines, Acceptance Rate, Tool Accept Rate, Lines of Code

### 참고

- `<synthetic>` 모델 (모델명 미파싱, 토큰 0)은 모든 aggregator에서 자동 필터링됩니다
- 새 팀원이 `install-hook.sh`를 실행하면 과거 데이터는 backfill JSON으로, 이후 데이터는 Prometheus로 자동 수집됩니다
- hook은 **자동 업데이트** 방식: 매 세션 종료 시 GitHub에서 최신 `otel_push.py`를 다운로드 후 실행

---

## 모니터링 인프라 (Railway)

실제 사용량 데이터는 Railway에 배포된 OTel 파이프라인을 통해 수집됩니다.

```
Claude Code 세션 종료
    ↓ Stop hook (otel_push.py)
    ↓ transcript JSONL 파싱 → tokens + commits + PRs + sessions
    ↓ OTLP HTTP
OTel Collector (Railway) → otel-collector-production-2dac.up.railway.app
    ↓ Prometheus scrape
Prometheus (Railway)     → prometheus-production-ae90.up.railway.app
    ↓ PromQL
Next.js Dashboard (Vercel, PROMETHEUS_URL 환경변수)
```

| 서비스 | Dockerfile | Railway 환경변수 |
|--------|-----------|----------------|
| OTel Collector | `docker/otel-collector/Dockerfile` | `RAILWAY_DOCKERFILE_PATH`, `PORT=4317` |
| Prometheus | `docker/prom/Dockerfile` | `RAILWAY_DOCKERFILE_PATH`, `PORT=9090` |
| Grafana | `docker/docker-compose.yml` 참조 | — |

---

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx                  # Overview (/)
│   ├── leaderboard/page.tsx      # Leaderboard (/leaderboard)
│   ├── members/page.tsx          # Members (/members)
│   ├── models/page.tsx           # Models (/models)
│   ├── utilization/page.tsx       # Utilization (/utilization)
│   ├── efficiency/page.tsx        # Efficiency (/efficiency)
│   └── api/
│       ├── analytics/route.ts    # GET /api/analytics?days=N
│       └── backfill/route.ts     # POST /api/backfill (install-hook.sh용)
├── components/
│   ├── layout/Sidebar.tsx        # 좌측 네비게이션
│   ├── cards/                    # KpiCard, TeamRankingCard
│   ├── charts/                   # Recharts 기반 차트 4종
│   └── leaderboard/
│       └── LeaderboardTable.tsx  # 리더보드 메인 컴포넌트
└── lib/
    ├── aggregators/              # 데이터 집계 (overview, members, models, costs, leaderboard, efficiency)
    ├── backfill/                 # 팀원별 backfill JSON (*.json)
    ├── hooks/useAnalytics.ts     # API fetch 공통 훅
    ├── prometheus.ts             # Prometheus PromQL 클라이언트
    ├── data-source.ts            # 데이터 소스 분기 (Backfill JSON + Prometheus, 유저별 자동 cutoff)
    ├── constants.ts              # 팀원, 모델 설정, 이름 매핑
    ├── mock-data.ts              # Claude Code Mock 데이터
    ├── mock-ai-tools.ts          # Gemini / GPT Mock 데이터
    ├── types.ts                  # TypeScript 타입 정의
    └── utils.ts                  # 포맷팅 유틸리티
```

---

## 기술 스택

| 항목 | 기술 | 버전 |
|------|------|------|
| Framework | Next.js (App Router) | 16.1.6 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | v4 |
| Charts | Recharts | 3.x |
| Data Source | OTel + Prometheus | — |
| Deploy | Vercel (앱) + Railway (모니터링) | — |

---

## 배포

### 자동 배포 (권장)

`main` 브랜치에 merge되면 Vercel이 자동으로 프로덕션 배포합니다.
PR 생성 시에는 Preview URL이 자동 생성됩니다.

### 환경변수 (Vercel)

Vercel Dashboard → `token-dashboard` → **Settings → Environment Variables**

```
PROMETHEUS_URL = https://prometheus-production-ae90.up.railway.app
```

### 수동 배포

```bash
npm run deploy
# 내부적으로 npx vercel --prod --yes 실행
```

---

## 기여 가이드

이 레포는 **PR 필수 정책**이 적용되어 있습니다.
`main` 브랜치에 직접 push 불가 — 반드시 아래 흐름을 따르세요.

```bash
# 1. 새 브랜치 생성
git checkout -b feat/your-feature

# 2. 작업 후 커밋
git add .
git commit -m "feat: 기능 설명"

# 3. 원격에 push
git push origin feat/your-feature

# 4. GitHub에서 PR 생성 → 리뷰 요청
```

> PR merge에는 **1명 이상의 Approve**가 필요합니다.

---

## 라이선스

Internal use only — EO Studio
