"""SQLite 기반 온보딩 진행 상황 관리."""
import sqlite3
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path


class DBManager:
    def __init__(self, db_path: str = "db/onboarding.db"):
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
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
        with self._lock:
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
        with self._lock:
            self.conn.execute(
                "UPDATE users SET current_mission = ?, last_activity = ? WHERE user_id = ?",
                (mission_id, now, user_id),
            )
            self.conn.commit()

    def complete_mission(self, user_id: str, mission_id: str):
        now = datetime.now(timezone.utc).isoformat()
        attempts = self.get_attempts(user_id, mission_id)
        with self._lock:
            self.conn.execute(
                """INSERT OR IGNORE INTO mission_progress
                   (user_id, mission_id, completed_at, attempts)
                   VALUES (?, ?, ?, ?)""",
                (user_id, mission_id, now, max(attempts, 1)),
            )
            self.conn.execute(
                """UPDATE mission_progress
                   SET attempts = ?
                   WHERE user_id = ? AND mission_id = ? AND attempts < ?""",
                (max(attempts, 1), user_id, mission_id, max(attempts, 1)),
            )
            self.conn.execute(
                "UPDATE users SET last_activity = ? WHERE user_id = ?",
                (now, user_id),
            )
            self.conn.commit()

    def complete_onboarding(self, user_id: str):
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
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
        with self._lock:
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
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        rows = self.conn.execute(
            "SELECT * FROM users WHERE last_activity < ? AND completed_at IS NULL",
            (cutoff,),
        ).fetchall()
        return [dict(r) for r in rows]

    def close(self):
        self.conn.close()
