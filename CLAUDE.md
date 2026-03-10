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
token-dashboard/      → AI 도구 사용량 대시보드 (Claude Code + Codex + Gemini CLI, Next.js + OTel → Prometheus → Vercel)
finance-dashboard/    → 경영진 재무 대시보드 (Next.js + Google Sheets API → Vercel)
leave-dashboard/      → 연차 관리 대시보드 (Next.js + Airtable API, 근로기준법 자동 계산)
```

---

## 3. 오답노트

AI 실수·재발 방지 기록: `agent/memory/ANTI_PATTERNS.md`
작업 전 반드시 참조할 것.

### 프로젝트별 오답노트
각 서브 프로젝트의 CLAUDE.md에 프로젝트 전용 오답노트가 있음. 해당 프로젝트 작업 시 참조:
- `token-dashboard/CLAUDE.md` → Prometheus 외삽, OTel, install-hook.sh, backfill API
- `finance-dashboard/CLAUDE.md` → Google Sheets 시트명, SA Base64, recharts, 환율 API
- `leave-dashboard/CLAUDE.md` → (아직 오답노트 없음)

### 공통 오답노트
- **Railway COPY 경로**: `railway up`은 프로젝트 루트를 빌드 컨텍스트로 사용 → Dockerfile의 COPY는 루트 기준 경로 필수
- **Railway PORT**: 공개 HTTPS 포워딩 포트와 앱 리슨 포트 반드시 일치 (불일치 시 502)
- **환경별 설정 하드코딩 금지**: `__PLACEHOLDER__` + `sed` 치환으로 분리
- **managed-settings.json env**: Claude Code 프로세스에만 적용, Bash 자식 프로세스에는 전달 안 됨
- **Anthropic Admin API 파라미터**: `start_date` → `starting_at`, `end_date` → `ending_at`, `group_by` → `group_by[]`
- **Windows UTF-8**: Python 3.x라도 Windows 기본 인코딩은 cp949 → `PYTHONUTF8=1` + `encoding='utf-8'` 필수
- **Vercel 연속 push 취소**: 이중 레포 sync 시 연달아 push하면 Vercel이 이전 빌드를 auto-cancel → 결과적으로 모든 빌드 Canceled 가능. `vercel ls --prod`로 확인 후 `npx vercel --prod` 수동 배포
- **Vercel Ignored Build Step CWD**: Root Directory 설정 시 ignoreCommand는 Root Directory 안에서 실행됨 → `git diff -- token-dashboard/`는 이중 경로 → `git diff --quiet HEAD^ HEAD -- .` 사용 필수
- **Vercel requireVerifiedCommits**: 기본 활성화 시 GPG 서명 없는 커밋 전면 차단 (Canceled). API로 비활성화: `PATCH /v9/projects/{id} {"gitProviderOptions":{"requireVerifiedCommits":false}}`
- **이중 레포 git reset 주의**: sub-repo에서 `git reset --hard origin/main` 시 모노레포 git에만 있는 신규 파일이 디스크에서 삭제됨. `git show HEAD:path > file`로 복원

---

## 4. 현재 진행 상태

### 당면 과제

#### Token Dashboard
- [x] 8명 설치 완료 (ash, chiri, cw.lim, izzy, jemin, june, jy.lim, songsh)
- [x] 커밋 카운트 전원 커버 (`git log --after` 기반)
- [x] Windows 설치 명령어 수정 (`powershell -Command` 래핑)
- [x] Setup 페이지 Mac/Windows 탭 토글 추가
- [x] 김찬희/김찬호 이메일·Slack ID·아바타 분리 수정
- [x] sync-dashboards.yml skipped 해결 (git diff 기반 변경 감지)
- [x] Sidebar 전체 메뉴 SVG 아이콘 추가
- [x] songsh/june backfill 추가, jemin 업데이트
- [x] 세계관 리뉴얼: AI Explorer's Log (Scout → AI Native)
- [x] 브랜드 컬러 #00E87A 통일 (18파일)
- [x] UI 사이즈 조정 + Web Interface Guidelines 준수
- [x] Gemini v0.33 metrics_url_path 복원
- [x] KpiCard 반응형 사이즈 + 모바일 2열 그리드 + InfoTip group/tip 패턴
- [x] data-integrity API + CI 워크플로우 (스파이크/유실 자동 감지 안전망)
- [x] Model 파이차트 컬러 수정 (Haiku 4.5 amber, Haiku 3.5 orange) + 값 기준 내림차순 정렬
- [x] Backfill API 커밋 대상을 모노레포(eoash/eoash)로 변경 + GITHUB_BACKFILL_TOKEN 갱신
- [x] Backfill v4 마커 + 스크립트 URL 모노레포 전환 (서브레포 의존 제거)
- [x] Prometheus 과다집계 우회: 세션별 backfill + 하루 1회 전체 re-backfill (backfill 우선으로 Prometheus 미사용)

#### Finance Dashboard
- [x] 세션15: Apps Script Web App + Sync 버튼 + Cash Position 자동화
- [x] 세션16: Cash Position 월별 필터링 + 환율 API 자동화
- [x] 브랜드 컬러 #00E87A 통일 (21파일) + Sidebar SVG 아이콘 추가
- [x] Sheets 에러 검증 완료 (#VALUE! 0개, #DIV/0! 54개는 미래 월 비율 계산으로 정상)

#### Leave Dashboard
- [ ] 입사일 필드 연동
- [ ] 재직자 필터링 (퇴사자 제외)
- [ ] 반차(0.5일) 처리
- [ ] Vercel 배포
- [ ] Slack `/연차` 슬래시 커맨드 연동

---

*마지막 업데이트: 2026-03-10*
