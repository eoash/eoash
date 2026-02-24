"""미션 로딩 및 진행 관리 엔진."""
import yaml
from src.db_manager import DBManager


class MissionEngine:
    def __init__(self, missions_path: str, db: DBManager):
        self.db = db
        with open(missions_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        self.categories = sorted(data["categories"], key=lambda c: c["order"])
        self.settings = data.get("settings", {})
        self._mission_map: dict[str, dict] = {}
        self._mission_category: dict[str, dict] = {}
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
        completed = self.db.get_progress(user_id)
        for mid in self._ordered_ids:
            if mid not in completed:
                return self._mission_map[mid]
        return None

    def get_progress_summary(self, user_id: str) -> dict:
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
