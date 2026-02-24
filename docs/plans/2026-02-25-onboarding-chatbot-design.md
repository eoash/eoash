# 신규 입사자 온보딩 챗봇 설계

**작성일**: 2026-02-25
**작성자**: 안서현 + Claude
**상태**: 승인됨

---

## 배경

기존 온보딩 시스템은 Slack/Notion 데이터를 수집해서 정적 마크다운 가이드를 생성하는 배치 시스템이었다.
문제점:
- 수집 데이터가 부정확하고 빈약함
- "문서 읽어봐" 방식은 체득이 안 됨
- 신규입사자가 직접 따라하면서 배우는 인터랙티브 온보딩이 필요

## 결정 사항

| 항목 | 결정 |
|------|------|
| 플랫폼 | Slack 봇 (DM 기반) |
| 콘텐츠 소스 | 하이브리드 — HR이 미션 틀 작성, AI가 세부 내용 채움 |
| 미션 완료 방식 | 버튼 클릭 (객관식/체크리스트) |
| 모니터링 | 자동 알림 + 대시보드 (슬래시 커맨드) |
| 미션 범위 | 계정 세팅, 문화/정책, 팀/사람, 업무 프로세스 4개 카테고리 |
| 진행 페이스 | 자유 + 리마인더 (미활동시 넛지) |
| 구현 방식 | Slack Bolt (Python) + missions.yaml + SQLite |

---

## 아키텍처

```
┌─────────────────────────────────────────────────┐
│                   Slack 봇 서버                   │
│              (Python + Slack Bolt)                │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ 미션 엔진 │  │ 리마인더  │  │ HR 커맨드     │  │
│  │          │  │ 스케줄러  │  │ /onboarding   │  │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       │              │                │          │
│       └──────────────┼────────────────┘          │
│                      │                           │
│              ┌───────┴───────┐                   │
│              │   SQLite DB   │                   │
│              │ (진행 상황)    │                   │
│              └───────────────┘                   │
│                                                   │
│  ┌───────────────────┐                           │
│  │  missions.yaml    │  ← HR이 미션 편집         │
│  │  (미션 정의)       │                           │
│  └───────────────────┘                           │
└─────────────────────────────────────────────────┘
```

### 핵심 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| Slack Bolt 앱 | DM 대화, 버튼 인터랙션 처리 |
| missions.yaml | 미션 정의 (제목, 설명, 버튼 옵션, 정답, 순서) |
| SQLite DB | 유저별 진행 상황, 시작일, 완료일 추적 |
| 리마인더 스케줄러 | 며칠 미활동시 넛지 DM 발송 |
| HR 슬래시 커맨드 | /onboarding-status → 전체 현황 조회 |

---

## 미션 데이터 구조

### missions.yaml 형식

```yaml
categories:
  - id: setup
    name: "계정/도구 세팅"
    order: 1
    missions:
      - id: join_slack_channels
        title: "필수 Slack 채널 가입하기"
        description: "아래 채널에 모두 가입해주세요"
        type: checklist
        items:
          - "#all-공지사항"
          - "#all-운영"
          - "#all-무엇이든물어보살"
        complete_message: "채널 가입 완료!"

      - id: setup_notion
        title: "Notion 워크스페이스 접속하기"
        type: confirm
        link: "https://notion.so/eostudio"
        complete_message: "Notion 접속 확인!"

  - id: culture
    name: "회사 문화/정책"
    order: 2
    missions:
      - id: read_announcement
        title: "최근 공지사항 확인하기"
        type: quiz
        question: "EO Studio의 재택근무 가능 요일은?"
        options:
          - "월~금 자유"
          - "화, 목"
          - "수, 금"
        answer: 1
        wrong_message: "다시 한번 확인해보세요!"
        complete_message: "정답!"

  - id: people
    name: "팀/사람 알기"
    order: 3
    missions:
      - id: meet_team
        title: "팀원에게 자기소개하기"
        type: confirm
        complete_message: "환영합니다!"

  - id: process
    name: "업무 프로세스 이해"
    order: 4
    missions:
      - id: expense_process
        title: "지출결의 프로세스 확인"
        type: quiz
        question: "지출결의 승인은 누구에게 요청하나요?"
        options:
          - "팀장"
          - "대표"
          - "재무팀"
        answer: 0
        complete_message: "맞아요! 팀장 승인 후 재무팀에서 처리합니다."

settings:
  reminder_after_days: 2
  deadline_days: 14
  hr_notify_channel: "hr-ops"
```

### 미션 타입

| 타입 | 동작 | 예시 |
|------|------|------|
| checklist | 여러 항목을 하나씩 체크 | 채널 가입, 도구 설치 |
| quiz | 객관식 버튼 → 정답 확인 | 정책 확인, 프로세스 이해 |
| confirm | "완료" 버튼만 | 문서 읽기, 자기소개 |

---

## 유저 플로우

```
[입사일]
  │
  ▼
봇이 DM 발송: "환영합니다! 온보딩을 시작할까요?"
  │
  ▼
[시작] 버튼 클릭
  │
  ▼
카테고리 1: 계정/도구 세팅
  ├─ 미션 1-1: 채널 가입 (checklist)
  ├─ 미션 1-2: Notion 접속 (confirm)
  └─ 카테고리 완료 → 다음 카테고리
  │
  ▼
카테고리 2~4 순차 진행
  │
  ▼
전체 완료!
  ├─ 신규입사자: "축하합니다! 온보딩 완료!"
  └─ #hr-ops: "김철수님 온보딩 완료 (소요 3일)"
```

리마인더: 2일 미활동 → DM 넛지 발송

---

## DB 스키마

```sql
-- 유저 테이블
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,     -- Slack user ID
    user_name TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    current_mission TEXT           -- 현재 진행 중인 미션 ID
);

-- 미션 완료 기록
CREATE TABLE mission_progress (
    user_id TEXT,
    mission_id TEXT,
    completed_at DATETIME,
    attempts INTEGER DEFAULT 1,    -- 퀴즈 시도 횟수
    PRIMARY KEY (user_id, mission_id)
);
```

---

## 파일 구조

```
onboarding/
├── app.py                    # Slack Bolt 앱 진입점
├── missions.yaml             # 미션 정의 (HR 편집용)
├── config.yaml               # 봇 설정
├── db/
│   └── onboarding.db         # SQLite (자동 생성)
├── src/
│   ├── mission_engine.py     # 미션 로딩, 진행 관리
│   ├── message_builder.py    # Slack Block Kit 메시지 생성
│   ├── db_manager.py         # SQLite CRUD
│   ├── reminder.py           # 리마인더 스케줄러
│   └── hr_commands.py        # /onboarding-status 슬래시 커맨드
├── requirements.txt
└── .env                      # SLACK_BOT_TOKEN, SLACK_APP_TOKEN
```

---

## HR 대시보드 (슬래시 커맨드)

```
/onboarding-status

📊 온보딩 현황
━━━━━━━━━━━━━━━━━━━━━━━━
✅ 김철수 — 완료 (2일 소요)
🔄 이영희 — 미션 3/8 진행 중
⏸️ 박지민 — 미션 1에서 2일째 멈춤
━━━━━━━━━━━━━━━━━━━━━━━━
총 3명 | 완료 1 | 진행 중 1 | 지연 1
```

---

## 기존 코드 처리

기존 `onboarding/` 폴더의 배치 수집/분석 코드는 `onboarding/_legacy/`로 이동하여 보관한다.
새 챗봇 코드로 폴더를 교체한다.
