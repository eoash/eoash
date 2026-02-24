# Architecture: 신규 입사자 온보딩 시스템

**작성자**: 시니어 소프트웨어 아키텍트 (Claude)
**기반 문서**: PRD v1.0 (2026-02-24)
**작성일**: 2026-02-24
**버전**: v1.0

---

## 컴포넌트 구조

시스템은 4개의 레이어로 구성된다: 설정 레이어 → 수집 레이어 → 분석 레이어 → 출력 레이어. 각 레이어는 독립적으로 실행 가능하며, `main.py`가 전체 파이프라인을 오케스트레이션한다.

### 1. 설정 레이어 (Config Layer)

| 컴포넌트 | 파일 | 역할 |
|---|---|---|
| ConfigLoader | `src/config_loader.py` | `config.yaml` 파싱, `.env` 로드, 설정 객체 제공 |
| config.yaml | `config/config.yaml` | 수집 대상 채널/페이지 ID, 분석 파라미터 설정 |
| .env | `.env` (gitignore) | Slack Bot Token, Notion API Key 등 인증 정보 |

### 2. 수집 레이어 (Collector Layer)

| 컴포넌트 | 파일 | 역할 |
|---|---|---|
| SlackCollector | `src/collectors/slack_collector.py` | Slack API로 채널 메시지(90일), 핀 메시지, 파일 링크 수집 |
| NotionCollector | `src/collectors/notion_collector.py` | Notion API로 지정 페이지 제목/본문/수정일 수집 |
| DataMasker | `src/collectors/data_masker.py` | 개인정보(이름, 이메일) 마스킹 처리 |
| RateLimiter | `src/collectors/rate_limiter.py` | Slack Tier 3 Rate Limit 준수를 위한 요청 딜레이 관리 |

수집된 데이터는 `data/raw/` 디렉토리에 채널별/페이지별 JSON 파일로 저장된다.

### 3. 분석 레이어 (Analyzer Layer)

| 컴포넌트 | 파일 | 역할 |
|---|---|---|
| TextAnalyzer | `src/analyzers/text_analyzer.py` | 회사 문화 키워드 Top 10 추출, 빈도 분석 |
| AnnouncementExtractor | `src/analyzers/announcement_extractor.py` | 최근 주요 공지사항 5건 추출 |
| ProjectMentionExtractor | `src/analyzers/project_mention_extractor.py` | 자주 언급된 프로젝트/팀 이름 추출 |
| NotionRanker | `src/analyzers/notion_ranker.py` | 신규 입사자 필독 Notion 문서 3~5개 선정 |

분석 결과는 `data/analyzed/` 디렉토리에 JSON으로 저장된다.

### 4. 출력 레이어 (Output Layer)

| 컴포넌트 | 파일 | 역할 |
|---|---|---|
| ReportGenerator | `src/outputs/report_generator.py` | 분석 결과를 Markdown 요약 리포트로 저장 |
| GuideGenerator | `src/outputs/guide_generator.py` | `ONBOARDING_GUIDE.md` 자동 생성 (템플릿 기반) |
| NotionUploader | `src/outputs/notion_uploader.py` | 생성된 가이드를 Notion에 자동 업로드 (선택) |
| SlackNotifier | `src/outputs/slack_notifier.py` | 갱신 완료 시 #hr-ops 채널에 완료 알림 발송 |

### 5. 오케스트레이터 (Orchestrator)

| 컴포넌트 | 파일 | 역할 |
|---|---|---|
| Main | `main.py` | 전체 파이프라인 순차 실행, 에러 핸들링, 실행 로그 기록 |

---

## 파일 구조

```
onboarding/
├── main.py                          # 전체 파이프라인 진입점
├── config.yaml                      # 수집 대상 및 분석 설정 (코드 수정 없이 변경 가능)
├── .env.example                     # 환경변수 템플릿 (gitignore 제외, 커밋 가능)
├── .env                             # 실제 인증 정보 (gitignore 포함, 커밋 불가)
├── .gitignore                       # .env, data/, output/ 제외 설정
├── requirements.txt                 # 의존 패키지 목록
│
├── docs/
│   ├── PRD.md                       # 제품 요구사항 정의서
│   └── ARCH.md                      # 기술 설계서 (현재 문서)
│
├── src/
│   ├── config_loader.py             # 설정 파일 파싱 및 환경변수 로드
│   │
│   ├── collectors/
│   │   ├── __init__.py
│   │   ├── slack_collector.py       # Slack 메시지 수집
│   │   ├── notion_collector.py      # Notion 페이지 수집
│   │   ├── data_masker.py           # 개인정보 마스킹
│   │   └── rate_limiter.py          # API Rate Limit 관리
│   │
│   ├── analyzers/
│   │   ├── __init__.py
│   │   ├── text_analyzer.py         # 키워드 빈도 분석
│   │   ├── announcement_extractor.py # 주요 공지사항 추출
│   │   ├── project_mention_extractor.py # 프로젝트/팀명 추출
│   │   └── notion_ranker.py         # 필독 문서 선정
│   │
│   └── outputs/
│       ├── __init__.py
│       ├── report_generator.py      # Markdown 요약 리포트 생성
│       ├── guide_generator.py       # ONBOARDING_GUIDE.md 생성
│       ├── notion_uploader.py       # Notion 업로드 (선택 실행)
│       └── slack_notifier.py        # Slack 완료 알림 발송
│
├── templates/
│   └── onboarding_guide_template.md # 온보딩 가이드 Markdown 템플릿
│
├── data/
│   ├── raw/
│   │   ├── slack/
│   │   │   └── {channel_name}_{YYYYMMDD}.json  # 채널별 수집 결과
│   │   └── notion/
│   │       └── {page_id}_{YYYYMMDD}.json        # 페이지별 수집 결과
│   └── analyzed/
│       └── analysis_{YYYYMMDD}.json             # 분석 결과 통합 저장
│
├── output/
│   ├── ONBOARDING_GUIDE.md          # 최종 생성된 온보딩 가이드
│   └── SUMMARY_REPORT_{YYYYMMDD}.md # 날짜별 분석 요약 리포트
│
└── logs/
    └── run_{YYYYMMDD}.log           # 실행 로그
```

---

## 구현 계획

### 1단계: 기반 설정 및 데이터 수집 (Foundation & Collection)

**목표**: config.yaml 로드, Slack/Notion 데이터 수집, 로컬 JSON 저장까지 동작

**작업 항목**:
1. `requirements.txt` 작성 및 패키지 설치 환경 구성
2. `.env.example` + `config.yaml` 템플릿 작성
3. `src/config_loader.py` 구현: `python-dotenv` + `PyYAML`로 설정 로드
4. `src/collectors/rate_limiter.py` 구현: 요청 간 딜레이(Tier 3: 50 req/min 준수)
5. `src/collectors/data_masker.py` 구현: 이름/이메일 정규식 마스킹
6. `src/collectors/slack_collector.py` 구현: `slack_sdk` 사용, 90일 이내 메시지/핀/파일 링크 수집 → `data/raw/slack/` 저장
7. `src/collectors/notion_collector.py` 구현: `notion-client` 사용, 페이지 제목/본문/수정일 수집 → `data/raw/notion/` 저장
8. `main.py` 1단계 버전: 수집 파이프라인만 실행, 결과 저장 확인

**완료 기준**: `python main.py --collect-only` 실행 시 `data/raw/` 하위에 JSON 파일 생성 확인

---

### 2단계: 분석 및 가이드 생성 (Analysis & Guide Generation)

**목표**: 수집 데이터를 분석하여 온보딩 가이드 자동 생성

**작업 항목**:
1. `src/analyzers/text_analyzer.py` 구현: `collections.Counter` + 불용어 처리로 키워드 Top 10 추출
2. `src/analyzers/announcement_extractor.py` 구현: 날짜 기준 정렬 후 최근 공지 5건 추출
3. `src/analyzers/project_mention_extractor.py` 구현: 빈도 기반 프로젝트/팀 이름 추출
4. `src/analyzers/notion_ranker.py` 구현: 조회수/수정일/키워드 매칭 기반 필독 문서 3~5개 선정
5. `src/outputs/report_generator.py` 구현: 분석 결과 → `output/SUMMARY_REPORT_{YYYYMMDD}.md` 생성
6. `templates/onboarding_guide_template.md` 작성: 회사 소개 / 팀 구조 / 필독 문서 / 채널 목록 / 2주 체크리스트 섹션 포함
7. `src/outputs/guide_generator.py` 구현: 템플릿 + 분석 결과 → `output/ONBOARDING_GUIDE.md` 생성
8. `main.py` 2단계 버전: 수집 + 분석 + 가이드 생성 전체 파이프라인 연결

**완료 기준**: `python main.py` 실행 시 `output/ONBOARDING_GUIDE.md` 자동 생성, 내용 정상 확인

---

### 3단계: 자동화 및 통합 (Automation & Integration)

**목표**: Notion 업로드, Slack 알림, 스케줄 자동 실행 구성

**작업 항목**:
1. `src/outputs/notion_uploader.py` 구현: 생성된 가이드를 Notion 지정 페이지에 업로드
2. `src/outputs/slack_notifier.py` 구현: 갱신 완료 메시지를 #hr-ops 채널에 발송 (업로드 링크 포함)
3. `main.py` 최종 버전: 전체 파이프라인 + 에러 핸들링 + 로그(`logs/run_{YYYYMMDD}.log`) 기록
4. GitHub Actions 워크플로우 파일 작성 (`.github/workflows/weekly_onboarding_update.yml`): 매주 월요일 09:00 KST 자동 실행, secrets 환경변수 연동
5. `--dry-run` 플래그 지원: Notion 업로드 및 Slack 알림 없이 로컬에서만 실행
6. 크로스 플랫폼 경로 처리 검증 (macOS / Windows / Linux)
7. 전체 실행 시간 10분 이내 완료 검증 및 최적화

**완료 기준**: GitHub Actions 스케줄 실행 성공, Slack #hr-ops 완료 알림 수신 확인

---

## 기술 스택

### 언어 및 런타임

| 항목 | 버전 |
|---|---|
| Python | 3.10 이상 |

### 외부 라이브러리

| 라이브러리 | 버전 | 용도 |
|---|---|---|
| `slack_sdk` | `>=3.27.0` | Slack API (메시지 수집, 알림 발송) |
| `notion-client` | `>=2.2.1` | Notion API (페이지 수집, 업로드) |
| `python-dotenv` | `>=1.0.0` | `.env` 파일 로드 |
| `PyYAML` | `>=6.0.1` | `config.yaml` 파싱 |
| `requests` | `>=2.31.0` | HTTP 요청 (보조) |
| `jinja2` | `>=3.1.4` | Markdown 템플릿 렌더링 |
| `python-dateutil` | `>=2.9.0` | 날짜 파싱 및 90일 범위 계산 |

### `requirements.txt` 내용

```
slack_sdk>=3.27.0
notion-client>=2.2.1
python-dotenv>=1.0.0
PyYAML>=6.0.1
requests>=2.31.0
jinja2>=3.1.4
python-dateutil>=2.9.0
```

### 인프라 / 자동화

| 항목 | 내용 |
|---|---|
| 스케줄러 | GitHub Actions (주 1회, 월요일 09:00 KST) |
| 로컬 대안 | cron (macOS/Linux) 또는 Task Scheduler (Windows) |
| 버전 관리 | Git + `.gitignore`로 `.env`, `data/`, `output/`, `logs/` 제외 |

---

## 인터페이스

### main.py

**입력**:
```
python main.py [OPTIONS]

Options:
  --collect-only     수집 단계만 실행 (분석/생성 생략)
  --analyze-only     분석 단계만 실행 (수집 생략, 기존 raw 데이터 사용)
  --dry-run          Notion 업로드 및 Slack 알림 생략, 로컬 파일만 생성
  --config PATH      config.yaml 경로 지정 (기본값: ./config.yaml)
```

**출력**:
- `data/raw/slack/{channel_name}_{YYYYMMDD}.json`
- `data/raw/notion/{page_id}_{YYYYMMDD}.json`
- `data/analyzed/analysis_{YYYYMMDD}.json`
- `output/SUMMARY_REPORT_{YYYYMMDD}.md`
- `output/ONBOARDING_GUIDE.md`
- `logs/run_{YYYYMMDD}.log`
- Slack #hr-ops 채널 완료 알림 (--dry-run 아닐 때)

---

### src/collectors/slack_collector.py

**입력**:
```python
SlackCollector(token: str, channels: list[str], days: int = 90)
collector.run() -> dict[str, list[dict]]
```

**출력**:
```json
{
  "general": [
    {
      "ts": "1708700000.000000",
      "text": "회사 공지 내용 (마스킹 처리됨)",
      "is_pinned": true,
      "has_files": false
    }
  ]
}
```

저장 경로: `data/raw/slack/general_20260224.json`

---

### src/collectors/notion_collector.py

**입력**:
```python
NotionCollector(token: str, page_ids: list[str])
collector.run() -> list[dict]
```

**출력**:
```json
[
  {
    "id": "page_id_abc123",
    "title": "팀 위키: 개발팀",
    "content": "페이지 본문 텍스트...",
    "last_edited_time": "2026-02-20T10:00:00.000Z"
  }
]
```

저장 경로: `data/raw/notion/page_id_abc123_20260224.json`

---

### src/analyzers/text_analyzer.py

**입력**:
```python
TextAnalyzer(raw_data_dir: str)
analyzer.extract_keywords(top_n: int = 10) -> list[dict]
```

**출력**:
```json
[
  {"keyword": "자동화", "count": 47},
  {"keyword": "재무", "count": 35},
  {"keyword": "온보딩", "count": 28}
]
```

---

### src/outputs/guide_generator.py

**입력**:
```python
GuideGenerator(analysis: dict, template_path: str)
generator.generate(output_path: str) -> str
```

**출력**: `output/ONBOARDING_GUIDE.md`

가이드 구성 섹션:
1. 회사 소개 요약 (키워드 기반 자동 생성)
2. 팀 구조 (자주 언급된 팀 이름 기반)
3. 필독 문서 링크 (Notion 필독 문서 3~5개)
4. 알아야 할 Slack 채널 목록 (config.yaml 기반)
5. 첫 2주 체크리스트 (템플릿 고정 항목)

---

### config.yaml 스키마

```yaml
slack:
  channels:
    - general
    - announcements
    - team-dev
    - team-ops
  collect_days: 90
  rate_limit_delay: 1.2  # 초 단위, Tier 3 기준

notion:
  page_ids:
    - "abc123def456"
    - "789ghi012jkl"
  workspace_name: "EO Studio"

analysis:
  keyword_top_n: 10
  announcement_count: 5
  must_read_count: 5

output:
  guide_path: "output/ONBOARDING_GUIDE.md"
  notion_upload: false       # true 시 Notion에 자동 업로드
  slack_notify_channel: "hr-ops"
```

---

## 보안 설계

- **인증 정보 분리**: 모든 토큰/키는 `.env`에만 저장, `.gitignore`에 반드시 포함
- **데이터 격리**: 수집 데이터는 `data/` 로컬 경로에만 저장, 외부 서버 전송 없음
- **마스킹 처리**: `data_masker.py`가 수집 직후 이름(한글/영문), 이메일 주소를 `[MASKED]`로 치환한 뒤 저장
- **예시 `.gitignore` 포함 항목**:
  ```
  .env
  data/
  output/
  logs/
  ```

---

**다음 단계**: 1단계 구현 착수 — `requirements.txt`, `config.yaml`, `config_loader.py` 작성부터 시작.
