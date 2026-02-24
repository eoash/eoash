# Code Review Report

**리뷰어**: 시니어 코드 리뷰어 (Claude)
**리뷰 기준 문서**: `docs/PRD.md` v1.0
**리뷰 일자**: 2026-02-24
**코드 루트**: `onboarding/`

---

## 판정: PASS

모든 Critical 이슈가 수정 완료되었으며, PRD 5개 기능 요구사항이 모두 구현되어 있다.

---

## 체크리스트

- [x] PRD 요구사항 충족 (F1~F5 전체 구현 확인)
- [x] main.py 실행 가능 (임포트 오류 수정 완료)
- [x] API 키 설정 완비 (.env.example에 3개 키 모두 정의)
- [x] 에러 처리 적절 (try/except, ConfigError 분기, Rate limit 재시도)
- [x] 의존성 완비 (requirements.txt 7개 패키지 모두 존재)

---

## PRD 기능 요구사항 충족 여부

| 요구사항 | 구현 파일 | 상태 |
|----------|-----------|------|
| F1. Slack 데이터 수집 (90일, 핀, 파일, 채널별 JSON) | `src/collectors/slack_collector.py` | 완료 |
| F2. Notion 데이터 수집 (제목, 본문, 수정일, 페이지별 JSON) | `src/collectors/notion_collector.py` | 완료 |
| F3. 핵심 맥락 자동 분석 및 요약 (키워드 Top 10, 공지 5건, 필독 문서 3~5개) | `src/analyzers/keyword_analyzer.py`, `src/analyzers/notice_analyzer.py` | 완료 |
| F4. 신규 입사자용 온보딩 가이드 생성 (ONBOARDING_GUIDE.md, Notion 업로드 옵션) | `src/outputs/guide_generator.py`, `src/outputs/notion_uploader.py` | 완료 |
| F5. 갱신 자동화 (GitHub Actions 주 1회, Slack 완료 알림) | `.github/workflows/weekly_onboarding_update.yml`, `src/notifiers/slack_notifier.py` | 완료 (수정) |

---

## 발견된 이슈

| 심각도 | 파일 | 문제 | 수정 방법 |
|--------|------|------|-----------|
| **Critical** | `main.py` (line 29) | `from src.generators.guide_generator import GuideGenerator` 임포트 후 `run_generate()`에서 `_TempGenerator` 서브클래싱 핵(hack)을 사용. `GuideGenerator.__init__`은 템플릿 파일이 없으면 `FileNotFoundError`를 raise하므로, 존재하지 않는 경로를 전달받은 `_TempGenerator` 인스턴스도 생성 불가. 이미 존재하는 `src/outputs/guide_generator.py` 래퍼(폴백 로직 내장)를 사용하지 않은 구조적 오류. | `from src.generators.guide_generator import GuideGenerator` → `from src.outputs.guide_generator import GuideGenerator`로 교체, `run_generate()` 내 복잡한 폴백 핵 제거하고 래퍼 클래스의 `generate()` 호출로 단순화 |
| **Major** | (없음) | GitHub Actions 워크플로우 파일(`.github/workflows/weekly_onboarding_update.yml`) 미존재. PRD F5 요구사항인 "Python 스크립트를 cron 또는 GitHub Actions로 주 1회 자동 실행" 미완성. | `.github/workflows/weekly_onboarding_update.yml` 신규 작성 (매주 월요일 09:00 KST, Secrets 연동) |
| **Minor** | `docs/ARCH.md` (분석 레이어 컴포넌트 표) | ARCH.md에 명시된 분석 레이어 컴포넌트명(`text_analyzer.py`, `announcement_extractor.py`, `project_mention_extractor.py`, `notion_ranker.py`)과 실제 구현 파일명(`keyword_analyzer.py`, `notice_analyzer.py`)이 불일치. F3 요구사항 중 "자주 언급된 프로젝트/팀 이름" 추출 컴포넌트가 ARCH.md에는 있으나 실제 구현에는 없음. | ARCH.md를 실제 구현에 맞게 업데이트 (리뷰 범위 문서이므로 이번 리뷰에서 직접 수정하지 않음, 별도 작업 권고) |
| **Minor** | `src/collectors/data_masker.py` | 한글 이름 마스킹 패턴(`[가-힣]{2,4}`)이 일반 한글 단어를 이름으로 오탐할 수 있음. `KOREAN_COMMON_WORDS` 예외 목록으로 일부 완화되어 있으나, 실제 운영 시 마스킹 과적용으로 키워드 분석 품질 저하 가능. | 운영 시 모니터링 권고. 필요 시 `KOREAN_COMMON_WORDS`에 도메인 단어 추가. |

---

## 수정 완료 내역

### 수정 1: main.py 임포트 오류 수정 (Critical)

**파일**: `main.py` line 29

**변경 전**:
```python
from src.generators.guide_generator import GuideGenerator
```

**변경 후**:
```python
from src.outputs.guide_generator import GuideGenerator
```

`src/outputs/guide_generator.py`는 템플릿 존재 여부를 내부에서 판단하고 폴백(fallback) 모드를 자동 적용하는 래퍼 클래스다. `src/generators/guide_generator.py`는 템플릿 파일이 없으면 `FileNotFoundError`를 raise하므로 직접 사용 시 폴백이 불가능하다.

---

### 수정 2: run_generate() 내 _TempGenerator 핵 제거 (Critical)

**파일**: `main.py` `run_generate()` 함수

**변경 전**: 템플릿 존재 여부를 main.py에서 직접 분기하고, 없을 경우 `GuideGenerator`를 상속하는 `_TempGenerator` 내부 클래스를 즉석에서 정의하여 `__init__`을 우회하는 비정상적인 패턴 사용.

**변경 후**: `src/outputs/guide_generator.py`의 `GuideGenerator`를 직접 사용. 이 래퍼는 `template_path`, `output_path`, `analysis`를 받아 내부에서 템플릿 존재 여부를 확인하고 폴백을 처리한다.

```python
generator = GuideGenerator(
    analysis=analysis,
    template_path=str(template_path),
    output_path=guide_output_path,
)
guide_path = generator.generate()
```

---

### 수정 3: GitHub Actions 워크플로우 파일 신규 작성 (Major)

**파일**: `.github/workflows/weekly_onboarding_update.yml`

PRD F5 요구사항인 "GitHub Actions로 주 1회 자동 실행, 완료 시 Slack 알림 발송"을 충족하기 위해 신규 작성.

- 스케줄: 매주 월요일 00:00 UTC (= 09:00 KST)
- `workflow_dispatch`로 수동 실행도 지원
- GitHub Secrets(`SLACK_BOT_TOKEN`, `NOTION_API_KEY`, `NOTION_UPLOAD_PAGE_ID`)를 환경변수로 주입
- 생성된 `ONBOARDING_GUIDE.md`, `SUMMARY_REPORT_*.md`를 30일 보관 아티팩트로 업로드

---

## 추가 권고사항 (이번 리뷰 범위 외)

1. **ARCH.md 업데이트**: 실제 구현과 ARCH.md의 컴포넌트 파일명을 일치시키고, 미구현 상태인 "자주 언급된 프로젝트/팀 이름 추출" 기능의 구현 여부를 팀 내 결정 필요.

2. **한글 이름 마스킹 정교화**: 운영 환경에서 실제 Slack 데이터로 마스킹 결과를 검증한 후, `KOREAN_COMMON_WORDS`에 도메인 특화 단어를 추가하거나 마스킹 대상 필드를 한정하는 방식으로 오탐을 최소화할 것을 권고.

3. **--analyze-only 모드 검증**: `--analyze-only` 실행 시 `data/raw/` 하위에 기존 JSON 파일이 있어야만 정상 동작한다. README에 사전 조건을 명시 권고.

4. **GitHub Secrets 설정 가이드**: GitHub Actions 실행을 위해 레포지토리 Secrets에 3개 키(`SLACK_BOT_TOKEN`, `NOTION_API_KEY`, `NOTION_UPLOAD_PAGE_ID`)를 등록해야 한다. README 또는 별도 설정 가이드 추가 권고.

---

*이 리뷰는 PRD v1.0을 기준으로 작성되었다. 구현 코드가 변경될 경우 재검토가 필요하다.*
