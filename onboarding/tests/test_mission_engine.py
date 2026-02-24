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
