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
    result = db.complete_mission("U123", "join_channels")
    assert result is True
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
    stale = db.get_stale_users(days=2)
    assert len(stale) == 0


def test_increment_attempts(db):
    db.start_onboarding("U123", "김철수")
    db.record_attempt("U123", "read_policy")
    db.record_attempt("U123", "read_policy")
    attempts = db.get_attempts("U123", "read_policy")
    assert attempts == 2


def test_complete_mission_idempotent(db):
    """complete_mission 중복 호출 시 False 반환 (레이스 컨디션 방어)."""
    db.start_onboarding("U123", "김철수")
    first = db.complete_mission("U123", "join_channels")
    second = db.complete_mission("U123", "join_channels")
    assert first is True
    assert second is False


def test_thread_local_connection(db):
    """thread-local 커넥션이 정상 동작하는지 확인."""
    import threading
    results = []

    def worker():
        db.start_onboarding("U_THREAD", "스레드테스트")
        user = db.get_user("U_THREAD")
        results.append(user is not None)
        db.close()

    t = threading.Thread(target=worker)
    t.start()
    t.join()
    assert results == [True]
