# CLAUDE.md — EO Studio Operations OS

---

## 0. 운영 규칙

**절대 자동 실행 금지**
- `my-context-sync` 스킬: 사용자가 "싱크" / "sync" 명시 요청 시에만
- 대외 이메일 발송 (`flip_send.py` 등): 반드시 확인 후
- Production 전환 (`BILL_COM_UPDATE_ENABLED=true` 등): 반드시 확인 후
- 법률 문서 수정 (계약서, 주주 서류): 반드시 확인 후
- 데이터베이스 스키마 변경 / 대량 데이터 삭제: 반드시 확인 후

**항상 해야 하는 것**
- 결과물(코드/솔루션)을 설명보다 먼저 제시
- 에러 발견 시 "이렇게 고치면 됩니다" 형태로 (문제 지적만 X)
- 옵션 나열 시 추천 하나를 명시
- 완료 후 "다음 단계" 제시
- 기술 설명은 비개발자 수준으로 (원리보다 사용법)
- 모호하면 추측하지 말고 물어볼 것
- 한국어로 대화, 코드·파일명은 영어
- 작업 전 오답노트 확인: `agent/memory/ANTI_PATTERNS.md`

**스킬 동기화 규칙**
- GitHub `eoash/ash-skills`가 Windows ↔ Mac 동기화 기준점 (로컬 클론: `/Users/ash/Documents/ash-skills`)
- `.claude/skills/` 에 스킬을 새로 만들거나 수정한 경우, 작업 완료 후 반드시 아래 순서로 실행:
  1. ash-skills 최신화: `cd /Users/ash/Documents/ash-skills && git pull`
  2. 스킬 복사: `cp -r /Users/ash/Documents/eoash/.claude/skills/<스킬명> /Users/ash/Documents/ash-skills/`
  3. GitHub push: `cd /Users/ash/Documents/ash-skills && git add <스킬명> && git commit -m "feat: <스킬명> 스킬 추가/수정" && git push`
  4. 로컬 재설치: `npx skills add eoash/ash-skills --skill '*' --agent claude-code -y`
- 스킬 삭제 시: ash-skills에서도 동일하게 삭제 후 push
- 다른 PC에서 최신 스킬을 받을 때: `git pull` 후 step 4만 실행

---

## 1. 사용자 프로필

**안서현 (Seohyun Ahn)** — Finance & Operations Lead, EO Studio
- 책임: 한국/미국/베트남 3개 법인 재무·운영·법무·인사 총괄
- 스타일: 70% 완성도로 먼저 작동 → 개선. 수작업보다 시스템. 빠른 실행.
- 비개발자지만 API 연동·코드 리뷰·멀티에이전트 설계 직접 수행

상세 프로필: `agent/shared/identity.md` | 회사 정보: `agent/shared/company.md` | 워크플로우: `agent/shared/workflows.md`

---

## 2. 시스템 맵

### 어드바이저 (판단·분석)
```
agent/advisors/senior_architect.md   → Alex  (코드/아키텍처/리팩터링)
agent/advisors/legal_advisor.md      → Lisa  (법률/계약/주주/외국환)
agent/advisors/finance_advisor.md    → Chris (재무/AR/FX/캐시플로우)
```
자동 라우팅: `/consult` → 키워드 감지 → Alex/Lisa/Chris 자동 분기

### 스킬 (`.claude/skills/`)
핵심 커스텀 스킬 (`my-*`):
```
my-context-sync       → 6개 소스 컨텍스트 통합 (수동 요청 시에만)
my-session-wrap       → 세션 마무리 정리
my-consult            → 어드바이저 자동 라우팅 (/consult)
my-fetch-tweet        → X/Twitter 요약·번역
my-fetch-youtube      → YouTube 자막 추출·요약
my-content-digest     → Quiz-First 콘텐츠 학습
my-townhall-agency    → 타운홀 슬라이드 4-Agent 자동 생성 (/townhall)
```
전체 스킬 목록: `.claude/skills/` 디렉토리 참조

### 자동화 스크립트 (`scripts/`)
```
scripts/daily/           → 일일 자동화 (AR 체크, TODO, 저널)
scripts/flip_send.py     → Flip 투자자 이메일 발송 (17명)
scripts/generate_*.py    → Flip 문서 자동 생성
scripts/read_cash_*.py   → 캐시플로우 데이터 조회
scripts/read_sheets*.py  → Google Sheets 데이터 조회
```

### 프로젝트별 메모리 (`agent/projects/`)
```
ar_automation/    → AR 매칭 자동화 (Bill.com + Plaid)
finance/          → 재무 대시보드, FX
legal/            → 법무 문서 (Flip 등)
operations/       → 운영 자동화, 온보딩
```

### 주요 서브 프로젝트
```
onboarding/       → Slack Bolt 온보딩 챗봇 (missions.yaml 기반)
dashboard/        → Streamlit 재무 대시보드 (별도 repo: eoash/eo-finance-dashboard)
ash_bot/          → 핵심 자동화 로직 (Bill.com, Plaid, Slack, Notion 연동)
townhall/         → 타운홀 슬라이드 산출물
ai-native-camp/   → AI Native 교육 캠프 (교육자료, 숙제, PPTX)
token-dashboard/      → Anthropic API 토큰 사용량 대시보드 (Next.js + OTel → Prometheus → Vercel)
finance-dashboard/    → 경영진 재무 대시보드 (Next.js + Google Sheets API → Vercel)
leave-dashboard/      → 연차 관리 대시보드 (Next.js + Airtable API, 근로기준법 자동 계산)
```

---

## 3. 오답노트

AI 실수·재발 방지 기록: `agent/memory/ANTI_PATTERNS.md`
작업 전 반드시 참조할 것.

### token-dashboard 파이프라인 함정 (2026-03-05)
- **Railway COPY 경로**: `railway up`은 프로젝트 루트를 빌드 컨텍스트로 사용 → Dockerfile의 COPY는 루트 기준 경로 필수 (예: `COPY docker/prom/entrypoint.sh`)
- **Railway PORT**: 공개 HTTPS 포워딩 포트 — 앱 리슨 포트와 반드시 일치해야 함, 불일치 시 502
- **환경별 설정 하드코딩 금지**: prometheus.yml scrape target 등은 `__PLACEHOLDER__` + `sed` 치환으로 분리
- **Anthropic Admin API 파라미터**: `start_date` → `starting_at`, `end_date` → `ending_at`, `group_by` → `group_by[]`
- **managed-settings.json env**: Claude Code 프로세스에만 적용됨, Bash 자식 프로세스에는 전달 안 됨
- **OTel delta→cumulative 외삽**: Prometheus `increase([1d])`는 카운터 첫째 날 데이터 포인트가 적으면 24시간으로 외삽하여 과대 계산 → per-user cutoff에 1일 grace period 추가 필수 (`addDays(cutoff, 1)`)

### Vercel + Google Service Account 함정 (2026-03-07)
- **Private Key newline 손상**: Vercel env var에 줄바꿈 있는 키 직접 넣으면 `invalid_grant` 에러 → **SA JSON 전체를 Base64 인코딩**해서 `GOOGLE_SA_KEY_BASE64`로 저장, 코드에서 `Buffer.from(env, "base64")` 디코딩
- **Service Account Sheets 공유 필수**: SA 이메일을 Google Sheets에 뷰어로 공유 안 하면 `Requested entity was not found` 에러
- **recharts v3 Tooltip 타입**: `TooltipContentProps<number, string>` 제네릭이 `content` prop에서 타입 에러 → `any` 타입 사용이 실용적

---

*마지막 업데이트: 2026-03-08*
