# 온보딩 챗봇 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Slack DM 기반 인터랙티브 온보딩 챗봇을 구축한다. 신규입사자가 버튼을 클릭하며 미션을 완료하고, HR이 슬래시 커맨드로 진행 상황을 모니터링한다.

**Architecture:** Slack Bolt (Socket Mode) 앱이 DM으로 미션을 전송하고 버튼 인터랙션을 처리한다. 미션 정의는 missions.yaml, 진행 추적은 SQLite. 리마인더 스케줄러가 미활동 유저에게 넛지를 보낸다.

**Tech Stack:** Python 3.14, slack_bolt 1.27, slack_sdk 3.39, SQLite3, PyYAML, APScheduler

---

## 사전 준비: Slack App 설정

Slack 앱에 Socket Mode를 활성화하고 App-Level Token을 발급받아야 한다.

**Step 1:** https://api.slack.com/apps 에서 기존 앱 선택

**Step 2:** Settings > Socket Mode → Enable Socket Mode → Generate App-Level Token
- Token Name: "onboarding-bot"
- Scope: `connections:write`
- 생성된 `xapp-...` 토큰을 .env의 `SLACK_APP_TOKEN`에 저장

**Step 3:** Features > Event Subscriptions → Enable Events
- Subscribe to bot events: `message.im` (DM 수신)

**Step 4:** Features > Interactivity & Shortcuts → Enable (Socket Mode이면 자동)

**Step 5:** OAuth & Permissions → Bot Token Scopes 추가:
- `chat:write` (메시지 발송)
- `im:history` (DM 읽기)
- `im:write` (DM 열기)
- `commands` (슬래시 커맨드)
- `users:read` (유저 이름 조회)

**Step 6:** Features > Slash Commands → Create New Command
- Command: `/onboarding-status`
- Description: "온보딩 진행 현황 조회"

**Step 7:** 앱 재설치 (OAuth & Permissions > Reinstall to Workspace)

---

## Task 1: 프로젝트 구조 세팅

**Files:**
- Move: `onboarding/*` → `onboarding/_legacy/`
- Create: `onboarding/requirements.txt`
- Modify: `onboarding/.env` (SLACK_APP_TOKEN 추가)

**Step 1: 기존 코드를 _legacy로 이동**

```bash
cd /c/Users/ash/ash/onboarding
mkdir -p _legacy
# 기존 파일들을 _legacy로 이동 (data/, logs/, output/ 제외)
mv main.py _legacy/
mv src/ _legacy/
mv templates/ _legacy/
mv config/ _legacy/
```

**Step 2: 새 디렉토리 구조 생성**

```bash
mkdir -p src db
```

**Step 3: requirements.txt 작성**

```
slack_bolt>=1.27.0
slack_sdk>=3.39.0
python-dotenv>=1.0.0
PyYAML>=6.0.1
APScheduler>=3.10.0
```

**Step 4: 의존 패키지 설치**

```bash
pip install -r requirements.txt
```

**Step 5: .env에 SLACK_APP_TOKEN 추가**

```
SLACK_BOT_TOKEN=xoxb-기존토큰
SLACK_APP_TOKEN=xapp-위에서발급받은토큰
```

**Step 6: Commit**

```bash
git add onboarding/
git commit -m "refactor: move legacy onboarding code, setup new chatbot structure"
```

---

## Task 2: missions.yaml 작성

**Files:**
- Create: `onboarding/missions.yaml`

**Step 1: missions.yaml 작성**

EO Studio 실제 채널과 정책을 반영한 미션 정의 파일. HR이 이 파일만 수정하면 미션을 추가/변경할 수 있다.

```yaml
categories:
  - id: setup
    name: "계정/도구 세팅"
    emoji: "🔧"
    order: 1
    missions:
      - id: join_channels
        title: "필수 Slack 채널 가입하기"
        description: "아래 채널에 모두 가입해주세요. 가입 후 체크해주세요!"
        type: checklist
        items:
          - "#all-공지사항"
          - "#all-운영"
          - "#all-무엇이든물어보살"
        complete_message: "채널 가입 완료! 이제 팀 소식을 바로 받을 수 있어요."

      - id: setup_notion
        title: "Notion 워크스페이스 접속 확인"
        description: "Notion 초대 메일을 확인하고 워크스페이스에 접속해주세요."
        type: confirm
        complete_message: "Notion 접속 확인 완료!"

  - id: culture
    name: "회사 문화/정책 파악"
    emoji: "📋"
    order: 2
    missions:
      - id: read_policy
        title: "근무 정책 확인하기"
        description: "Notion의 '근무 정책' 페이지를 읽고 아래 퀴즈를 풀어주세요."
        type: quiz
        question: "연차 신청은 어디서 하나요?"
        options:
          - "Slack #all-운영"
          - "에어테이블 연차 폼"
          - "이메일"
        answer: 1
        wrong_message: "다시 한번 Notion 근무 정책 페이지를 확인해보세요!"
        complete_message: "정답! 에어테이블 연차 폼에서 신청하면 됩니다."

      - id: read_expense
        title: "지출결의 프로세스 확인"
        description: "Notion의 '지출결의 가이드'를 읽고 아래 퀴즈를 풀어주세요."
        type: quiz
        question: "지출결의 승인은 누구에게 요청하나요?"
        options:
          - "팀장"
          - "대표"
          - "재무팀 직접"
        answer: 0
        wrong_message: "힌트: 결재 라인을 확인해보세요!"
        complete_message: "맞아요! 팀장 승인 후 재무팀에서 처리합니다."

  - id: people
    name: "팀/사람 알기"
    emoji: "👋"
    order: 3
    missions:
      - id: check_org
        title: "조직도 확인하기"
        description: "Notion의 '조직도' 페이지에서 우리 팀 구조를 확인해주세요."
        type: confirm
        complete_message: "조직도 확인 완료! 누가 어떤 일을 하는지 감이 오시나요?"

      - id: self_intro
        title: "자기소개 올리기"
        description: "#all-운영 채널에 간단한 자기소개를 올려주세요. (이름, 역할, 한 줄 소개)"
        type: confirm
        complete_message: "환영합니다! 팀원들이 반가워할 거예요 🎉"

  - id: process
    name: "업무 프로세스 이해"
    emoji: "⚙️"
    order: 4
    missions:
      - id: weekly_meeting
        title: "주간 미팅 일정 확인"
        description: "Google Calendar에서 반복 미팅 일정을 확인해주세요."
        type: confirm
        complete_message: "주간 미팅 일정 확인 완료!"

      - id: task_tool
        title: "업무 관리 도구 확인"
        description: "ClickUp에 접속하여 본인에게 할당된 스페이스를 확인해주세요."
        type: confirm
        complete_message: "업무 도구 세팅 완료! 이제 업무를 시작할 준비가 됐어요."

settings:
  reminder_after_days: 2
  deadline_days: 14
  hr_notify_channel: "hr-ops"
  welcome_message: |
    안녕하세요! EO Studio 온보딩 봇입니다 🎉
    입사를 진심으로 환영합니다!

    지금부터 미션을 하나씩 완료하면서 회사에 적응해보세요.
    총 4개 카테고리, 8개 미션이 준비되어 있어요.

    준비되셨으면 아래 버튼을 눌러주세요!
  completion_message: |
    🎉 축하합니다! 온보딩 미션을 모두 완료했어요!
    이제 EO Studio의 정식 멤버입니다.
    궁금한 게 있으면 언제든 #all-무엇이든물어보살 채널에 질문해주세요.
```

**Step 2: Commit**

```bash
git add onboarding/missions.yaml
git commit -m "feat: add onboarding missions definition"
```

---

## Task 3: DB Manager (SQLite)

**Files:**
- Create: `onboarding/src/__init__.py`
- Create: `onboarding/src/db_manager.py`
- Create: `onboarding/tests/test_db_manager.py`

**Step 1: __init__.py 생성**

빈 파일.

**Step 2: test_db_manager.py 작성 (테스트 먼저)**

```python
"""DB Manager 테스트."""
import os
import pytest
from src.db_manager import DBManager

TEST_DB = "test_onboarding.db"


@pytest.fixture
def db():
    """테스트용 DB 매니저. 테스트 후 DB 파일 삭제."""
    manager = DBManager(TEST_DB)
    yield manager
    manager.close()
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)


def test_start_onboarding(db):
    db.start_onboarding("U123", "김철수")
    user = db.get_user("U123")
    assert user is not None
    assert user["user_name"] == "김철수"
    assert user["current_mission"] == ""
    assert user["completed_at"] is None


def test_complete_mission(db):
    db.start_onboarding("U123", "김철수")
    db.complete_mission("U123", "join_channels")
    progress = db.get_progress("U123")
    assert "join_channels" in progress


def test_update_current_mission(db):
    db.start_onboarding("U123", "김철수")
    db.update_current_mission("U123", "setup_notion")
    user = db.get_user("U123")
    assert user["current_mission"] == "setup_notion"


def test_complete_onboarding(db):
    db.start_onboarding("U123", "김철수")
    db.complete_onboarding("U123")
    user = db.get_user("U123")
    assert user["completed_at"] is not None


def test_get_all_users(db):
    db.start_onboarding("U1", "김철수")
    db.start_onboarding("U2", "이영희")
    users = db.get_all_users()
    assert len(users) == 2


def test_get_stale_users(db):
    db.start_onboarding("U1", "김철수")
    # stale = 마지막 활동이 N일 이상 전인 유저
    # 방금 시작했으므로 stale이 아님
    stale = db.get_stale_users(days=2)
    assert len(stale) == 0


def test_increment_attempts(db):
    db.start_onboarding("U123", "김철수")
    db.record_attempt("U123", "read_policy")
    db.record_attempt("U123", "read_policy")
    attempts = db.get_attempts("U123", "read_policy")
    assert attempts == 2
```

**Step 3: 테스트 실행 (실패 확인)**

```bash
cd /c/Users/ash/ash/onboarding
python -m pytest tests/test_db_manager.py -v
```
Expected: FAIL (db_manager 모듈 없음)

**Step 4: db_manager.py 구현**

```python
"""SQLite 기반 온보딩 진행 상황 관리."""
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


class DBManager:
    def __init__(self, db_path: str = "db/onboarding.db"):
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self._create_tables()

    def _create_tables(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                user_name TEXT NOT NULL,
                started_at TEXT NOT NULL,
                completed_at TEXT,
                current_mission TEXT DEFAULT '',
                last_activity TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS mission_progress (
                user_id TEXT NOT NULL,
                mission_id TEXT NOT NULL,
                completed_at TEXT NOT NULL,
                attempts INTEGER DEFAULT 1,
                PRIMARY KEY (user_id, mission_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            );

            CREATE TABLE IF NOT EXISTS mission_attempts (
                user_id TEXT NOT NULL,
                mission_id TEXT NOT NULL,
                attempted_at TEXT NOT NULL
            );
        """)
        self.conn.commit()

    def start_onboarding(self, user_id: str, user_name: str):
        now = datetime.now(timezone.utc).isoformat()
        self.conn.execute(
            """INSERT OR IGNORE INTO users
               (user_id, user_name, started_at, current_mission, last_activity)
               VALUES (?, ?, ?, '', ?)""",
            (user_id, user_name, now, now),
        )
        self.conn.commit()

    def get_user(self, user_id: str) -> dict | None:
        row = self.conn.execute(
            "SELECT * FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
        return dict(row) if row else None

    def update_current_mission(self, user_id: str, mission_id: str):
        now = datetime.now(timezone.utc).isoformat()
        self.conn.execute(
            "UPDATE users SET current_mission = ?, last_activity = ? WHERE user_id = ?",
            (mission_id, now, user_id),
        )
        self.conn.commit()

    def complete_mission(self, user_id: str, mission_id: str):
        now = datetime.now(timezone.utc).isoformat()
        attempts = self.get_attempts(user_id, mission_id)
        self.conn.execute(
            """INSERT OR REPLACE INTO mission_progress
               (user_id, mission_id, completed_at, attempts)
               VALUES (?, ?, ?, ?)""",
            (user_id, mission_id, now, max(attempts, 1)),
        )
        self.conn.execute(
            "UPDATE users SET last_activity = ? WHERE user_id = ?",
            (now, user_id),
        )
        self.conn.commit()

    def complete_onboarding(self, user_id: str):
        now = datetime.now(timezone.utc).isoformat()
        self.conn.execute(
            "UPDATE users SET completed_at = ?, last_activity = ? WHERE user_id = ?",
            (now, now, user_id),
        )
        self.conn.commit()

    def get_progress(self, user_id: str) -> set[str]:
        rows = self.conn.execute(
            "SELECT mission_id FROM mission_progress WHERE user_id = ?",
            (user_id,),
        ).fetchall()
        return {row["mission_id"] for row in rows}

    def record_attempt(self, user_id: str, mission_id: str):
        now = datetime.now(timezone.utc).isoformat()
        self.conn.execute(
            "INSERT INTO mission_attempts (user_id, mission_id, attempted_at) VALUES (?, ?, ?)",
            (user_id, mission_id, now),
        )
        self.conn.commit()

    def get_attempts(self, user_id: str, mission_id: str) -> int:
        row = self.conn.execute(
            "SELECT COUNT(*) as cnt FROM mission_attempts WHERE user_id = ? AND mission_id = ?",
            (user_id, mission_id),
        ).fetchone()
        return row["cnt"] if row else 0

    def get_all_users(self) -> list[dict]:
        rows = self.conn.execute("SELECT * FROM users ORDER BY started_at DESC").fetchall()
        return [dict(r) for r in rows]

    def get_stale_users(self, days: int = 2) -> list[dict]:
        """마지막 활동이 N일 이상 전이고 아직 완료하지 않은 유저."""
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        rows = self.conn.execute(
            """SELECT * FROM users
               WHERE last_activity < ? AND completed_at IS NULL""",
            (cutoff,),
        ).fetchall()
        return [dict(r) for r in rows]

    def close(self):
        self.conn.close()
```

**Step 5: 테스트 실행 (통과 확인)**

```bash
cd /c/Users/ash/ash/onboarding
python -m pytest tests/test_db_manager.py -v
```
Expected: ALL PASS

**Step 6: Commit**

```bash
git add onboarding/src/ onboarding/tests/
git commit -m "feat: add SQLite DB manager with tests"
```

---

## Task 4: Mission Engine

**Files:**
- Create: `onboarding/src/mission_engine.py`
- Create: `onboarding/tests/test_mission_engine.py`

**Step 1: test_mission_engine.py 작성**

```python
"""Mission Engine 테스트."""
import os
import pytest
from src.mission_engine import MissionEngine
from src.db_manager import DBManager

TEST_DB = "test_engine.db"
MISSIONS_YAML = "missions.yaml"


@pytest.fixture
def engine():
    db = DBManager(TEST_DB)
    eng = MissionEngine(MISSIONS_YAML, db)
    yield eng
    db.close()
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)


def test_load_missions(engine):
    cats = engine.get_categories()
    assert len(cats) == 4
    assert cats[0]["id"] == "setup"


def test_get_all_mission_ids(engine):
    ids = engine.get_all_mission_ids()
    assert "join_channels" in ids
    assert "task_tool" in ids
    assert len(ids) == 8


def test_get_next_mission_first(engine):
    engine.db.start_onboarding("U1", "테스트")
    mission = engine.get_next_mission("U1")
    assert mission is not None
    assert mission["id"] == "join_channels"


def test_get_next_mission_after_one(engine):
    engine.db.start_onboarding("U1", "테스트")
    engine.db.complete_mission("U1", "join_channels")
    mission = engine.get_next_mission("U1")
    assert mission["id"] == "setup_notion"


def test_get_next_mission_all_done(engine):
    engine.db.start_onboarding("U1", "테스트")
    for mid in engine.get_all_mission_ids():
        engine.db.complete_mission("U1", mid)
    mission = engine.get_next_mission("U1")
    assert mission is None


def test_get_mission_by_id(engine):
    m = engine.get_mission("read_policy")
    assert m is not None
    assert m["type"] == "quiz"
    assert len(m["options"]) == 3


def test_get_progress_summary(engine):
    engine.db.start_onboarding("U1", "테스트")
    engine.db.complete_mission("U1", "join_channels")
    engine.db.complete_mission("U1", "setup_notion")
    summary = engine.get_progress_summary("U1")
    assert summary["completed"] == 2
    assert summary["total"] == 8
    assert summary["current_category"] == "회사 문화/정책 파악"
```

**Step 2: 테스트 실행 (실패 확인)**

```bash
python -m pytest tests/test_mission_engine.py -v
```

**Step 3: mission_engine.py 구현**

```python
"""미션 로딩 및 진행 관리 엔진."""
import yaml
from pathlib import Path
from src.db_manager import DBManager


class MissionEngine:
    def __init__(self, missions_path: str, db: DBManager):
        self.db = db
        with open(missions_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        self.categories = sorted(data["categories"], key=lambda c: c["order"])
        self.settings = data.get("settings", {})
        # 미션 ID → 미션 매핑 (빠른 조회용)
        self._mission_map: dict[str, dict] = {}
        # 미션 ID → 카테고리 매핑
        self._mission_category: dict[str, dict] = {}
        # 순서대로 정렬된 미션 ID 리스트
        self._ordered_ids: list[str] = []
        for cat in self.categories:
            for m in cat["missions"]:
                self._mission_map[m["id"]] = m
                self._mission_category[m["id"]] = cat
                self._ordered_ids.append(m["id"])

    def get_categories(self) -> list[dict]:
        return self.categories

    def get_all_mission_ids(self) -> list[str]:
        return list(self._ordered_ids)

    def get_mission(self, mission_id: str) -> dict | None:
        return self._mission_map.get(mission_id)

    def get_mission_category(self, mission_id: str) -> dict | None:
        return self._mission_category.get(mission_id)

    def get_next_mission(self, user_id: str) -> dict | None:
        """유저의 다음 미완료 미션을 반환. 전부 완료면 None."""
        completed = self.db.get_progress(user_id)
        for mid in self._ordered_ids:
            if mid not in completed:
                return self._mission_map[mid]
        return None

    def get_progress_summary(self, user_id: str) -> dict:
        """유저의 진행 현황 요약."""
        completed = self.db.get_progress(user_id)
        total = len(self._ordered_ids)
        done = len(completed)
        next_mission = self.get_next_mission(user_id)
        current_cat = None
        if next_mission:
            cat = self._mission_category[next_mission["id"]]
            current_cat = cat["name"]
        return {
            "completed": done,
            "total": total,
            "percent": int(done / total * 100) if total > 0 else 0,
            "current_category": current_cat,
            "next_mission": next_mission,
        }
```

**Step 4: 테스트 실행 (통과 확인)**

```bash
python -m pytest tests/test_mission_engine.py -v
```

**Step 5: Commit**

```bash
git add onboarding/src/mission_engine.py onboarding/tests/test_mission_engine.py
git commit -m "feat: add mission engine with progress tracking"
```

---

## Task 5: Message Builder (Slack Block Kit)

**Files:**
- Create: `onboarding/src/message_builder.py`
- Create: `onboarding/tests/test_message_builder.py`

**Step 1: test_message_builder.py 작성**

```python
"""Message Builder 테스트."""
from src.message_builder import MessageBuilder


def test_welcome_message():
    blocks = MessageBuilder.welcome("환영합니다!")
    assert len(blocks) >= 2
    # 시작 버튼이 있어야 함
    actions = [b for b in blocks if b.get("type") == "actions"]
    assert len(actions) == 1


def test_checklist_mission():
    mission = {
        "id": "join_channels",
        "title": "채널 가입",
        "description": "채널에 가입하세요",
        "type": "checklist",
        "items": ["#general", "#random"],
    }
    blocks = MessageBuilder.mission(mission, checked=[])
    actions = [b for b in blocks if b.get("type") == "actions"]
    assert len(actions) == 1
    # 체크리스트 아이템 수만큼 버튼
    buttons = actions[0]["elements"]
    assert len(buttons) == 2


def test_quiz_mission():
    mission = {
        "id": "quiz1",
        "title": "퀴즈",
        "description": "맞춰보세요",
        "type": "quiz",
        "question": "1+1은?",
        "options": ["1", "2", "3"],
    }
    blocks = MessageBuilder.mission(mission)
    actions = [b for b in blocks if b.get("type") == "actions"]
    assert len(actions) == 1
    buttons = actions[0]["elements"]
    assert len(buttons) == 3


def test_confirm_mission():
    mission = {
        "id": "confirm1",
        "title": "확인",
        "description": "읽었으면 확인",
        "type": "confirm",
    }
    blocks = MessageBuilder.mission(mission)
    actions = [b for b in blocks if b.get("type") == "actions"]
    buttons = actions[0]["elements"]
    assert len(buttons) == 1
    assert buttons[0]["text"]["text"] == "완료 ✅"


def test_progress_bar():
    blocks = MessageBuilder.progress_update(3, 8, "회사 문화/정책 파악")
    text_blocks = [b for b in blocks if b.get("type") == "section"]
    assert len(text_blocks) >= 1


def test_hr_status():
    users = [
        {"user_name": "김철수", "completed_at": "2026-02-25", "completed": 8, "total": 8},
        {"user_name": "이영희", "completed_at": None, "completed": 3, "total": 8},
    ]
    blocks = MessageBuilder.hr_status(users)
    assert len(blocks) >= 2
```

**Step 2: 테스트 실행 (실패 확인)**

**Step 3: message_builder.py 구현**

```python
"""Slack Block Kit 메시지 빌더."""


class MessageBuilder:
    @staticmethod
    def welcome(text: str) -> list[dict]:
        return [
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": text},
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "시작하기 🚀"},
                        "action_id": "start_onboarding",
                        "style": "primary",
                    }
                ],
            },
        ]

    @staticmethod
    def mission(mission: dict, checked: list[str] | None = None) -> list[dict]:
        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": mission["title"]},
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": mission["description"]},
            },
        ]

        mission_type = mission["type"]
        mission_id = mission["id"]

        if mission_type == "checklist":
            checked = checked or []
            elements = []
            for item in mission["items"]:
                prefix = "✅ " if item in checked else ""
                elements.append({
                    "type": "button",
                    "text": {"type": "plain_text", "text": f"{prefix}{item}"},
                    "action_id": f"check_{mission_id}_{item}",
                    "value": item,
                })
            blocks.append({"type": "actions", "elements": elements})

        elif mission_type == "quiz":
            blocks.append({
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*{mission['question']}*"},
            })
            elements = []
            for i, option in enumerate(mission["options"]):
                elements.append({
                    "type": "button",
                    "text": {"type": "plain_text", "text": option},
                    "action_id": f"quiz_{mission_id}_{i}",
                    "value": str(i),
                })
            blocks.append({"type": "actions", "elements": elements})

        elif mission_type == "confirm":
            blocks.append({
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "완료 ✅"},
                        "action_id": f"confirm_{mission_id}",
                        "style": "primary",
                    }
                ],
            })

        return blocks

    @staticmethod
    def mission_complete(message: str) -> list[dict]:
        return [
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"✅ {message}"},
            },
        ]

    @staticmethod
    def mission_wrong(message: str) -> list[dict]:
        return [
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"❌ {message}"},
            },
        ]

    @staticmethod
    def progress_update(completed: int, total: int, category: str | None) -> list[dict]:
        pct = int(completed / total * 100) if total > 0 else 0
        filled = int(pct / 10)
        bar = "█" * filled + "░" * (10 - filled)
        text = f"*진행률: {bar} {pct}%* ({completed}/{total} 완료)"
        if category:
            text += f"\n다음 카테고리: *{category}*"
        return [
            {"type": "divider"},
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": text},
            },
        ]

    @staticmethod
    def category_intro(name: str, emoji: str) -> list[dict]:
        return [
            {"type": "divider"},
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"{emoji} {name}"},
            },
        ]

    @staticmethod
    def all_complete(message: str) -> list[dict]:
        return [
            {"type": "divider"},
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": message},
            },
        ]

    @staticmethod
    def hr_status(users: list[dict]) -> list[dict]:
        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "📊 온보딩 현황"},
            },
            {"type": "divider"},
        ]
        if not users:
            blocks.append({
                "type": "section",
                "text": {"type": "mrkdwn", "text": "진행 중인 온보딩이 없습니다."},
            })
            return blocks

        done_count = 0
        in_progress = 0
        for u in users:
            if u.get("completed_at"):
                icon = "✅"
                status = "완료"
                done_count += 1
            else:
                icon = "🔄"
                status = f"{u['completed']}/{u['total']} 진행 중"
                in_progress += 1
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{icon} *{u['user_name']}* — {status}",
                },
            })

        blocks.append({"type": "divider"})
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"총 {len(users)}명 | 완료 {done_count} | 진행 중 {in_progress}",
                }
            ],
        })
        return blocks

    @staticmethod
    def reminder(user_name: str, remaining: int) -> list[dict]:
        return [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"안녕하세요 {user_name}님! 아직 미션 {remaining}개가 남아있어요 😊\n이어서 해볼까요?",
                },
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "이어하기 ▶️"},
                        "action_id": "resume_onboarding",
                        "style": "primary",
                    }
                ],
            },
        ]
```

**Step 4: 테스트 실행 (통과 확인)**

```bash
python -m pytest tests/test_message_builder.py -v
```

**Step 5: Commit**

```bash
git add onboarding/src/message_builder.py onboarding/tests/test_message_builder.py
git commit -m "feat: add Slack Block Kit message builder"
```

---

## Task 6: Slack Bolt 앱 (app.py)

**Files:**
- Create: `onboarding/app.py`

이 파일은 Slack 이벤트/액션 핸들러를 등록하는 메인 앱이다. 단위 테스트보다 수동 통합 테스트로 검증한다.

**Step 1: app.py 작성**

```python
"""EO Studio 온보딩 챗봇 — Slack Bolt 앱."""
import logging
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

from src.db_manager import DBManager
from src.mission_engine import MissionEngine
from src.message_builder import MessageBuilder

# 환경 변수 로드
load_dotenv()

# 로깅
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 초기화
BASE_DIR = Path(__file__).parent
db = DBManager(str(BASE_DIR / "db" / "onboarding.db"))
engine = MissionEngine(str(BASE_DIR / "missions.yaml"), db)

app = App(token=os.environ["SLACK_BOT_TOKEN"])


# ── 헬퍼 ─────────────────────────────────────────────

def send_next_mission(client, user_id: str, channel: str):
    """다음 미션을 전송하거나, 전체 완료 처리."""
    mission = engine.get_next_mission(user_id)
    if mission is None:
        # 전체 완료
        db.complete_onboarding(user_id)
        client.chat_postMessage(
            channel=channel,
            blocks=MessageBuilder.all_complete(engine.settings.get("completion_message", "온보딩 완료!")),
        )
        # HR 알림
        user = db.get_user(user_id)
        hr_channel = engine.settings.get("hr_notify_channel", "hr-ops")
        try:
            client.chat_postMessage(
                channel=hr_channel,
                text=f"🎉 {user['user_name']}님이 온보딩을 완료했습니다!",
            )
        except Exception as e:
            logger.warning(f"HR 알림 실패: {e}")
        return

    # 카테고리가 바뀌었으면 카테고리 소개
    summary = engine.get_progress_summary(user_id)
    cat = engine.get_mission_category(mission["id"])
    prev_mission_ids = engine.get_all_mission_ids()
    idx = prev_mission_ids.index(mission["id"])
    if idx == 0 or engine.get_mission_category(prev_mission_ids[idx - 1])["id"] != cat["id"]:
        client.chat_postMessage(
            channel=channel,
            blocks=MessageBuilder.category_intro(cat["name"], cat.get("emoji", "📌")),
        )

    db.update_current_mission(user_id, mission["id"])
    client.chat_postMessage(
        channel=channel,
        blocks=MessageBuilder.mission(mission),
    )


# ── 이벤트 핸들러 ────────────────────────────────────

@app.event("message")
def handle_dm(event, client):
    """DM 메시지 수신 — 봇이 보낸 메시지는 무시."""
    if event.get("bot_id"):
        return
    user_id = event["user"]
    channel = event["channel"]
    user = db.get_user(user_id)
    if user is None:
        # 아직 온보딩 시작 안 한 유저
        return
    # 진행 중인 유저가 텍스트를 보내면 현재 미션 다시 안내
    mission = engine.get_next_mission(user_id)
    if mission:
        client.chat_postMessage(
            channel=channel,
            text="버튼을 눌러서 미션을 진행해주세요! 👆",
        )


# ── 액션 핸들러 ──────────────────────────────────────

@app.action("start_onboarding")
def handle_start(ack, body, client):
    ack()
    user_id = body["user"]["id"]
    user_name = body["user"].get("name", body["user"]["id"])
    # 유저 이름 조회
    try:
        info = client.users_info(user=user_id)
        user_name = info["user"]["real_name"] or info["user"]["name"]
    except Exception:
        pass
    db.start_onboarding(user_id, user_name)
    channel = body["channel"]["id"]
    client.chat_postMessage(
        channel=channel,
        text=f"좋아요 {user_name}님! 첫 번째 미션을 시작합니다 🚀",
    )
    send_next_mission(client, user_id, channel)


@app.action("resume_onboarding")
def handle_resume(ack, body, client):
    ack()
    user_id = body["user"]["id"]
    channel = body["channel"]["id"]
    send_next_mission(client, user_id, channel)


@app.action(re.compile(r"^confirm_"))
def handle_confirm(ack, body, client):
    ack()
    user_id = body["user"]["id"]
    channel = body["channel"]["id"]
    action_id = body["actions"][0]["action_id"]
    mission_id = action_id.replace("confirm_", "")
    mission = engine.get_mission(mission_id)
    if not mission:
        return
    db.complete_mission(user_id, mission_id)
    client.chat_postMessage(
        channel=channel,
        blocks=MessageBuilder.mission_complete(mission.get("complete_message", "완료!")),
    )
    # 진행률 표시 후 다음 미션
    summary = engine.get_progress_summary(user_id)
    client.chat_postMessage(
        channel=channel,
        blocks=MessageBuilder.progress_update(
            summary["completed"], summary["total"], summary["current_category"]
        ),
    )
    send_next_mission(client, user_id, channel)


@app.action(re.compile(r"^quiz_"))
def handle_quiz(ack, body, client):
    ack()
    user_id = body["user"]["id"]
    channel = body["channel"]["id"]
    action_id = body["actions"][0]["action_id"]
    # quiz_{mission_id}_{선택index}
    parts = action_id.split("_")
    chosen = int(parts[-1])
    mission_id = "_".join(parts[1:-1])
    mission = engine.get_mission(mission_id)
    if not mission:
        return
    db.record_attempt(user_id, mission_id)
    if chosen == mission["answer"]:
        db.complete_mission(user_id, mission_id)
        client.chat_postMessage(
            channel=channel,
            blocks=MessageBuilder.mission_complete(mission.get("complete_message", "정답!")),
        )
        summary = engine.get_progress_summary(user_id)
        client.chat_postMessage(
            channel=channel,
            blocks=MessageBuilder.progress_update(
                summary["completed"], summary["total"], summary["current_category"]
            ),
        )
        send_next_mission(client, user_id, channel)
    else:
        client.chat_postMessage(
            channel=channel,
            blocks=MessageBuilder.mission_wrong(
                mission.get("wrong_message", "틀렸어요! 다시 시도해보세요.")
            ),
        )
        # 미션 다시 표시
        client.chat_postMessage(
            channel=channel,
            blocks=MessageBuilder.mission(mission),
        )


@app.action(re.compile(r"^check_"))
def handle_checklist(ack, body, client):
    ack()
    user_id = body["user"]["id"]
    channel = body["channel"]["id"]
    action_id = body["actions"][0]["action_id"]
    value = body["actions"][0]["value"]
    # check_{mission_id}_{item} — mission_id 추출
    parts = action_id.split("_")
    # mission_id는 check_ 뒤, 마지막 item 값 앞
    # action_id 형식: check_{mission_id}_{item_text}
    # item은 value에 있으므로 mission_id = check_ 제거 후 _item 제거
    prefix = "check_"
    suffix = f"_{value}"
    mission_id = action_id[len(prefix):]
    if mission_id.endswith(suffix):
        mission_id = mission_id[:-len(suffix)]

    mission = engine.get_mission(mission_id)
    if not mission:
        return

    # 체크 상태 관리: mission_attempts 테이블을 임시 체크 저장으로 활용
    db.record_attempt(user_id, f"{mission_id}__check__{value}")

    # 체크된 아이템 조회
    checked = set()
    for item in mission["items"]:
        attempts = db.get_attempts(user_id, f"{mission_id}__check__{item}")
        if attempts > 0:
            checked.add(item)

    if checked >= set(mission["items"]):
        # 전부 체크 완료
        db.complete_mission(user_id, mission_id)
        client.chat_postMessage(
            channel=channel,
            blocks=MessageBuilder.mission_complete(mission.get("complete_message", "완료!")),
        )
        summary = engine.get_progress_summary(user_id)
        client.chat_postMessage(
            channel=channel,
            blocks=MessageBuilder.progress_update(
                summary["completed"], summary["total"], summary["current_category"]
            ),
        )
        send_next_mission(client, user_id, channel)
    else:
        # 아직 남음 — 업데이트된 체크리스트 다시 표시
        client.chat_postMessage(
            channel=channel,
            text=f"✅ {value} 체크! (남은 항목: {len(mission['items']) - len(checked)}개)",
        )


# ── 슬래시 커맨드 ────────────────────────────────────

@app.command("/onboarding-status")
def handle_status(ack, body, client):
    ack()
    all_users = db.get_all_users()
    user_data = []
    for u in all_users:
        progress = db.get_progress(u["user_id"])
        user_data.append({
            "user_name": u["user_name"],
            "completed_at": u["completed_at"],
            "completed": len(progress),
            "total": len(engine.get_all_mission_ids()),
        })
    blocks = MessageBuilder.hr_status(user_data)
    client.chat_postEphemeral(
        channel=body["channel_id"],
        user=body["user_id"],
        blocks=blocks,
    )


# ── 온보딩 시작 트리거 (HR이 수동 실행) ──────────────

@app.command("/onboarding-start")
def handle_start_command(ack, body, client):
    """HR이 /onboarding-start @유저 로 온보딩을 시작시킨다."""
    ack()
    text = body.get("text", "").strip()
    # <@U12345|username> 형태에서 user_id 추출
    match = re.search(r"<@(U[A-Z0-9]+)", text)
    if not match:
        client.chat_postEphemeral(
            channel=body["channel_id"],
            user=body["user_id"],
            text="사용법: `/onboarding-start @신규입사자`",
        )
        return
    target_user_id = match.group(1)
    # 유저 이름 조회
    try:
        info = client.users_info(user=target_user_id)
        user_name = info["user"]["real_name"] or info["user"]["name"]
    except Exception:
        user_name = target_user_id
    # DM으로 웰컴 메시지 발송
    try:
        dm = client.conversations_open(users=[target_user_id])
        dm_channel = dm["channel"]["id"]
        welcome_text = engine.settings.get("welcome_message", "온보딩을 시작합니다!")
        client.chat_postMessage(
            channel=dm_channel,
            blocks=MessageBuilder.welcome(welcome_text),
        )
        client.chat_postEphemeral(
            channel=body["channel_id"],
            user=body["user_id"],
            text=f"✅ {user_name}님에게 온보딩 메시지를 발송했습니다.",
        )
    except Exception as e:
        client.chat_postEphemeral(
            channel=body["channel_id"],
            user=body["user_id"],
            text=f"❌ 발송 실패: {e}",
        )


# ── 메인 ─────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("온보딩 챗봇 시작...")
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()
```

**Step 2: Commit**

```bash
git add onboarding/app.py
git commit -m "feat: add Slack Bolt onboarding chatbot app"
```

---

## Task 7: 리마인더 스케줄러

**Files:**
- Create: `onboarding/src/reminder.py`

**Step 1: reminder.py 작성**

```python
"""미활동 유저 리마인더 스케줄러."""
import logging
from src.db_manager import DBManager
from src.mission_engine import MissionEngine
from src.message_builder import MessageBuilder

logger = logging.getLogger(__name__)


def send_reminders(client, db: DBManager, engine: MissionEngine):
    """미활동 유저에게 리마인더 DM을 보낸다."""
    days = engine.settings.get("reminder_after_days", 2)
    stale_users = db.get_stale_users(days=days)

    for user in stale_users:
        user_id = user["user_id"]
        summary = engine.get_progress_summary(user_id)
        remaining = summary["total"] - summary["completed"]

        if remaining <= 0:
            continue

        try:
            dm = client.conversations_open(users=[user_id])
            dm_channel = dm["channel"]["id"]
            blocks = MessageBuilder.reminder(user["user_name"], remaining)
            client.chat_postMessage(channel=dm_channel, blocks=blocks)
            logger.info(f"리마인더 발송: {user['user_name']} ({remaining}개 남음)")
        except Exception as e:
            logger.warning(f"리마인더 발송 실패 ({user_id}): {e}")
```

**Step 2: app.py에 스케줄러 통합**

app.py의 메인 블록에 APScheduler를 추가한다.

```python
# app.py 맨 아래 메인 블록을 다음으로 교체:

if __name__ == "__main__":
    from apscheduler.schedulers.background import BackgroundScheduler
    from src.reminder import send_reminders

    logger.info("온보딩 챗봇 시작...")

    # 리마인더 스케줄러: 매일 오전 10시 (KST)
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        send_reminders,
        "cron",
        hour=1,  # UTC 01:00 = KST 10:00
        args=[app.client, db, engine],
    )
    scheduler.start()
    logger.info("리마인더 스케줄러 시작 (매일 KST 10:00)")

    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()
```

**Step 3: Commit**

```bash
git add onboarding/src/reminder.py onboarding/app.py
git commit -m "feat: add daily reminder scheduler for stale users"
```

---

## Task 8: 통합 테스트 (수동)

**Step 1: 봇 실행**

```bash
cd /c/Users/ash/ash/onboarding
python app.py
```

**Step 2: 테스트 시나리오**

1. Slack에서 `/onboarding-start @본인` 실행 → DM으로 웰컴 메시지 수신 확인
2. "시작하기" 버튼 클릭 → 첫 미션(채널 가입 체크리스트) 표시 확인
3. 체크리스트 버튼 클릭 → 체크 완료 메시지 확인
4. 전체 체크 → 다음 미션 자동 전환 확인
5. 퀴즈 미션에서 오답 → 재시도 메시지 확인
6. 퀴즈 정답 → 완료 메시지 + 진행률 표시 확인
7. 전체 미션 완료 → 축하 메시지 + #hr-ops 알림 확인
8. `/onboarding-status` → 현황 표시 확인

**Step 3: 발견된 이슈 수정 후 최종 커밋**

```bash
git add -A
git commit -m "fix: address integration test findings"
```

---

## 슬래시 커맨드 추가 등록 (사전 준비 보충)

Slack App 설정에서 `/onboarding-start` 커맨드도 추가 등록 필요:
- Command: `/onboarding-start`
- Description: "신규입사자 온보딩 시작"
- Usage Hint: `@유저이름`

---

## 최종 파일 구조

```
onboarding/
├── app.py                    # Slack Bolt 앱
├── missions.yaml             # 미션 정의
├── requirements.txt          # 의존 패키지
├── .env                      # 환경 변수
├── db/
│   └── onboarding.db         # SQLite (자동 생성)
├── src/
│   ├── __init__.py
│   ├── db_manager.py         # DB CRUD
│   ├── mission_engine.py     # 미션 로딩/진행 관리
│   ├── message_builder.py    # Slack Block Kit 빌더
│   └── reminder.py           # 리마인더 스케줄러
├── tests/
│   ├── test_db_manager.py
│   ├── test_mission_engine.py
│   └── test_message_builder.py
└── _legacy/                  # 기존 배치 시스템 (보관)
    ├── main.py
    ├── src/
    ├── config/
    └── templates/
```
