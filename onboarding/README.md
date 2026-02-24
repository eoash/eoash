# 신규 입사자 온보딩 자동화 시스템

Slack 메시지와 Notion 페이지를 자동 수집·분석하여 신규 입사자 전용 온보딩 가이드를 자동으로 생성하는 시스템입니다.

## 기능 요약

- Slack 지정 채널 최근 90일 메시지 수집 (핀 메시지, 파일 링크 포함)
- Notion 지정 페이지 제목·본문·수정일 수집
- 회사 문화 키워드 Top 10 자동 추출
- 주요 공지사항 5건 자동 추출
- 필독 Notion 문서 5건 자동 선정
- 온보딩 가이드 Markdown 자동 생성 (`ONBOARDING_GUIDE.md`)
- 완료 시 Slack `#hr-ops` 채널 알림 발송
- 개인정보 자동 마스킹 (이메일, 전화번호, 이름)

---

## 설치 방법

### 1. 요구사항

- Python 3.10 이상
- pip

### 2. 의존 패키지 설치

```bash
pip install -r requirements.txt
```

### 3. 환경변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 실제 API 키를 입력합니다.

```bash
cp .env.example .env
```

`.env` 파일 수정:

```
SLACK_BOT_TOKEN=xoxb-your-actual-token
NOTION_API_KEY=secret_your-actual-key
NOTION_UPLOAD_PAGE_ID=your-page-id  # Notion 업로드 사용 시
```

### 4. Slack Bot 설정

1. [Slack API](https://api.slack.com/apps) 에서 새 앱 생성
2. OAuth & Permissions 메뉴에서 아래 Bot Token Scopes 추가:
   - `channels:history` — 채널 메시지 읽기
   - `channels:read` — 채널 목록 조회
   - `pins:read` — 핀 메시지 조회
   - `files:read` — 파일 링크 조회
   - `chat:write` — 완료 알림 발송
3. 워크스페이스에 앱 설치 후 Bot User OAuth Token 복사
4. 봇을 수집할 채널에 `/invite @봇이름` 으로 초대

### 5. Notion Integration 설정

1. [Notion Integrations](https://www.notion.so/my-integrations) 에서 새 Integration 생성
2. 읽기 권한(Read content) 선택
3. Integration Secret 복사 → `.env`의 `NOTION_API_KEY`에 입력
4. 수집할 각 Notion 페이지에서 우측 상단 `...` → `Connections` → Integration 연결
5. 페이지 URL에서 페이지 ID 추출 → `config/config.yaml`의 `notion.page_ids`에 추가

### 6. 설정 파일 수정

`config/config.yaml` 파일을 수집 대상에 맞게 수정합니다.

```yaml
slack:
  channels:
    - general
    - announcements
    - team-dev       # 실제 채널명으로 변경

notion:
  page_ids:
    - "abc123..."    # 실제 페이지 ID로 변경
  workspace_name: "EO Studio"  # 회사명 변경
```

---

## 사용법

### 전체 파이프라인 실행

```bash
python main.py
```

수집 → 분석 → 가이드 생성 → Slack 알림 전체를 순서대로 실행합니다.

### 수집만 실행

```bash
python main.py --collect-only
```

데이터만 수집하고 `data/raw/` 에 저장합니다. 분석과 가이드 생성은 생략합니다.

### 분석만 실행 (기존 수집 데이터 사용)

```bash
python main.py --analyze-only
```

이미 `data/raw/` 에 저장된 데이터를 기반으로 분석과 가이드 생성만 실행합니다.

### Dry-run 모드 (로컬 테스트)

```bash
python main.py --dry-run
```

Notion 업로드와 Slack 알림 없이 로컬 파일만 생성합니다. 테스트 및 검토 시 사용합니다.

### 커스텀 설정 파일 사용

```bash
python main.py --config /path/to/custom_config.yaml
```

---

## 출력 파일

실행 후 아래 파일이 생성됩니다.

| 파일 | 설명 |
|------|------|
| `output/ONBOARDING_GUIDE.md` | 신규 입사자 전용 온보딩 가이드 |
| `output/SUMMARY_REPORT_{YYYYMMDD}.md` | 관리자용 분석 요약 리포트 |
| `data/raw/slack/{채널명}_{날짜}.json` | 수집된 Slack 메시지 |
| `data/raw/notion/{페이지ID}_{날짜}.json` | 수집된 Notion 페이지 |
| `data/analyzed/analysis_{날짜}.json` | 분석 결과 JSON |
| `logs/run_{날짜}.log` | 실행 로그 |

---

## 파일 구조

```
onboarding/
├── main.py                          # 전체 파이프라인 진입점
├── config/
│   └── config.yaml                  # 수집 대상 및 분석 설정
├── .env.example                     # 환경변수 템플릿
├── requirements.txt                 # 의존 패키지
├── src/
│   ├── config_loader.py             # 설정 파일 및 환경변수 로더
│   ├── collectors/
│   │   ├── slack_collector.py       # Slack 메시지 수집
│   │   ├── notion_collector.py      # Notion 페이지 수집
│   │   ├── data_masker.py           # 개인정보 마스킹
│   │   └── rate_limiter.py          # API Rate Limit 관리
│   ├── analyzers/
│   │   ├── keyword_analyzer.py      # 키워드 빈도 분석
│   │   └── notice_analyzer.py       # 공지사항 및 필독 문서 추출
│   ├── generators/
│   │   └── guide_generator.py       # 온보딩 가이드 생성
│   ├── outputs/
│   │   ├── report_generator.py      # 분석 요약 리포트 생성
│   │   ├── notion_uploader.py       # Notion 업로드
│   │   └── slack_notifier.py        # Slack 알림 (outputs 레이어 래퍼)
│   └── notifiers/
│       └── slack_notifier.py        # Slack 완료 알림 발송
└── templates/
    └── onboarding_guide_template.md # 온보딩 가이드 Jinja2 템플릿
```

---

## 자동 스케줄 실행 (GitHub Actions)

매주 월요일 오전 9시(KST)에 자동으로 실행하려면 GitHub Actions 워크플로우를 설정합니다.

`.github/workflows/weekly_onboarding_update.yml` 파일을 생성하고:
- GitHub Repository Secrets에 `SLACK_BOT_TOKEN`, `NOTION_API_KEY` 추가
- 워크플로우 트리거: `schedule: cron: '0 0 * * 1'` (UTC 기준 월요일 00:00 = KST 09:00)

로컬에서 cron을 사용하는 경우:

```bash
# crontab -e 에 추가 (macOS/Linux)
0 9 * * 1 cd /path/to/onboarding && python main.py >> logs/cron.log 2>&1
```

---

## 보안 주의사항

- `.env` 파일은 절대 Git에 커밋하지 마세요 (`.gitignore`에 포함됨)
- `data/`, `output/`, `logs/` 디렉토리도 Git에서 제외됨
- 수집된 데이터는 로컬에만 저장되며 외부 서버로 전송되지 않음
- 개인정보는 수집 직후 자동으로 `[EMAIL]`, `[PHONE]`, `[NAME]`으로 마스킹됨

---

## 문제 해결

**Q. `SLACK_BOT_TOKEN이 설정되지 않았습니다` 오류**
A. `.env` 파일이 `onboarding/` 디렉토리에 있는지 확인하세요.

**Q. Slack 채널 수집이 0건**
A. 봇이 해당 채널에 초대되어 있는지 확인하세요 (`/invite @봇이름`).

**Q. Notion 페이지 수집 404 오류**
A. Notion 페이지에 Integration이 연결되어 있는지 확인하세요 (페이지 우측 `...` → Connections).

**Q. 템플릿 렌더링 오류**
A. `templates/onboarding_guide_template.md` 파일이 있는지 확인하세요. 없으면 폴백 모드로 자동 전환됩니다.

---

**작성자**: 안서현 (Finance & Operations Lead, EO Studio)
**버전**: v1.0 (2026-02-24)
