"""SQLite 기반 온보딩 진행 상황 관리.

Thread-local 커넥션 사용 — 각 스레드가 자체 커넥션을 보유하여
check_same_thread=False 없이 안전하게 멀티스레드 동작.
"""

import sqlite3
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path


class DBManager:
    def __init__(self, db_path: str = "db/onboarding.db"):
        self._db_path = db_path
        self._local = threading.local()
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._create_tables()

    @property
    def _conn(self) -> sqlite3.Connection:
        """Thread-local 커넥션 반환. 없으면 생성."""
        conn = getattr(self._local, "conn", None)
        if conn is None:
            conn = sqlite3.connect(self._db_path)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            self._local.conn = conn
        return conn

    def _create_tables(self):
        self._conn.executescript("""
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
            CREATE INDEX IF NOT EXISTS idx_mission_attempts
                ON mission_attempts (user_id, mission_id);
        """)
        self._conn.commit()

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    # ── 유저 관리 ──────────────────────────────────────

    def start_onboarding(self, user_id: str, user_name: str) -> None:
        now = self._now()
        self._conn.execute(
            """INSERT OR IGNORE INTO users
               (user_id, user_name, started_at, current_mission, last_activity)
               VALUES (?, ?, ?, '', ?)""",
            (user_id, user_name, now, now),
        )
        self._conn.commit()

    def get_user(self, user_id: str) -> dict | None:
        row = self._conn.execute(
            "SELECT * FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
        return dict(row) if row else None

    def update_current_mission(self, user_id: str, mission_id: str) -> None:
        now = self._now()
        self._conn.execute(
            "UPDATE users SET current_mission = ?, last_activity = ? WHERE user_id = ?",
            (mission_id, now, user_id),
        )
        self._conn.commit()

    def complete_onboarding(self, user_id: str) -> None:
        now = self._now()
        self._conn.execute(
            "UPDATE users SET completed_at = ?, last_activity = ? WHERE user_id = ?",
            (now, now, user_id),
        )
        self._conn.commit()

    def get_all_users(self) -> list[dict]:
        rows = self._conn.execute(
            "SELECT * FROM users ORDER BY started_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]

    def get_stale_users(self, days: int = 2) -> list[dict]:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        rows = self._conn.execute(
            "SELECT * FROM users WHERE last_activity < ? AND completed_at IS NULL",
            (cutoff,),
        ).fetchall()
        return [dict(r) for r in rows]

    # ── 미션 진행 ──────────────────────────────────────

    def complete_mission(self, user_id: str, mission_id: str) -> bool:
        """미션 완료 처리. 새로 완료 시 True, 이미 완료된 경우 False.

        INSERT OR IGNORE + rowcount 로 원자적 중복 방어.
        """
        now = self._now()
        attempts = self.get_attempts(user_id, mission_id)
        cursor = self._conn.execute(
            """INSERT OR IGNORE INTO mission_progress
               (user_id, mission_id, completed_at, attempts)
               VALUES (?, ?, ?, ?)""",
            (user_id, mission_id, now, max(attempts, 1)),
        )
        if cursor.rowcount == 0:
            return False  # 이미 완료됨
        self._conn.execute(
            "UPDATE users SET last_activity = ? WHERE user_id = ?",
            (now, user_id),
        )
        self._conn.commit()
        return True

    def get_progress(self, user_id: str) -> set[str]:
        rows = self._conn.execute(
            "SELECT mission_id FROM mission_progress WHERE user_id = ?",
            (user_id,),
        ).fetchall()
        return {row["mission_id"] for row in rows}

    def record_attempt(self, user_id: str, mission_id: str) -> None:
        now = self._now()
        self._conn.execute(
            "INSERT INTO mission_attempts (user_id, mission_id, attempted_at) VALUES (?, ?, ?)",
            (user_id, mission_id, now),
        )
        self._conn.commit()

    def get_attempts(self, user_id: str, mission_id: str) -> int:
        row = self._conn.execute(
            "SELECT COUNT(*) as cnt FROM mission_attempts WHERE user_id = ? AND mission_id = ?",
            (user_id, mission_id),
        ).fetchone()
        return row["cnt"] if row else 0

    def get_all_progress(self) -> dict[str, set]:
        rows = self._conn.execute(
            "SELECT user_id, mission_id FROM mission_progress"
        ).fetchall()
        result: dict[str, set] = {}
        for row in rows:
            result.setdefault(row["user_id"], set()).add(row["mission_id"])
        return result

    # ── 리셋 / 정리 ─────────────────────────────────────

    def reset_user(self, user_id: str) -> None:
        """특정 유저의 온보딩 진행 데이터를 초기화한다.
        users 레코드는 유지하되 mission_progress / mission_attempts 삭제,
        completed_at / current_mission 초기화.
        """
        now = self._now()
        self._conn.execute("DELETE FROM mission_progress WHERE user_id = ?", (user_id,))
        self._conn.execute("DELETE FROM mission_attempts WHERE user_id = ?", (user_id,))
        self._conn.execute(
            "UPDATE users SET completed_at = NULL, current_mission = '', last_activity = ? WHERE user_id = ?",
            (now, user_id),
        )
        self._conn.commit()

    def close(self) -> None:
        """현재 스레드의 커넥션 닫기."""
        conn = getattr(self._local, "conn", None)
        if conn is not None:
            conn.close()
            self._local.conn = None
