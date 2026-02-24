"""OnboardingService 통합 테스트.

Mock Slack client를 사용하여 전체 온보딩 플로우를 검증.
"""

import os
from unittest.mock import MagicMock, call
import pytest

from src.db_manager import DBManager
from src.mission_engine import MissionEngine
from src.onboarding_service import OnboardingService

TEST_DB = "test_service.db"
MISSIONS_YAML = "missions.yaml"


@pytest.fixture
def setup():
    """서비스 + Mock client 세트업."""
    db = DBManager(TEST_DB)
    engine = MissionEngine(MISSIONS_YAML, db)
    service = OnboardingService(db, engine)
    client = MagicMock()
    # users_info 기본 응답
    client.users_info.return_value = {
        "user": {"real_name": "테스트유저", "name": "testuser"}
    }
    yield service, db, engine, client
    db.close()
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    # WAL 파일 정리
    for suffix in ("-wal", "-shm"):
        path = TEST_DB + suffix
        if os.path.exists(path):
            os.remove(path)


# ── 온보딩 시작 ──────────────────────────────────────

class TestStart:
    def test_start_registers_user_and_sends_mission(self, setup):
        service, db, engine, client = setup
        service.start(client, "U1", "C1")

        # DB에 유저 등록 확인
        user = db.get_user("U1")
        assert user is not None
        assert user["user_name"] == "테스트유저"

        # Slack 메시지 전송 확인 (환영 + 카테고리 소개 + 첫 미션)
        assert client.chat_postMessage.call_count >= 2

    def test_start_idempotent(self, setup):
        """같은 유저로 두 번 start 해도 에러 없이 동작."""
        service, db, engine, client = setup
        service.start(client, "U1", "C1")
        service.start(client, "U1", "C1")
        user = db.get_user("U1")
        assert user is not None


# ── confirm 미션 ─────────────────────────────────────

class TestConfirmMission:
    def test_confirm_completes_and_advances(self, setup):
        service, db, engine, client = setup
        db.start_onboarding("U1", "테스트")
        service.confirm_mission(client, "U1", "join_channels", "C1")

        assert "join_channels" in db.get_progress("U1")
        # 완료 메시지 + 진행률 + 다음 미션 = 최소 3번 전송
        assert client.chat_postMessage.call_count >= 3

    def test_confirm_duplicate_no_double_message(self, setup):
        """같은 미션 두 번 confirm → 메시지 한 번만."""
        service, db, engine, client = setup
        db.start_onboarding("U1", "테스트")

        service.confirm_mission(client, "U1", "join_channels", "C1")
        count_after_first = client.chat_postMessage.call_count

        service.confirm_mission(client, "U1", "join_channels", "C1")
        count_after_second = client.chat_postMessage.call_count

        # 두 번째 호출에서는 추가 메시지 없음
        assert count_after_second == count_after_first

    def test_confirm_nonexistent_mission_no_error(self, setup):
        """존재하지 않는 미션 ID → 에러 없이 무시."""
        service, db, engine, client = setup
        db.start_onboarding("U1", "테스트")
        service.confirm_mission(client, "U1", "nonexistent_mission", "C1")
        assert client.chat_postMessage.call_count == 0


# ── 퀴즈 미션 ───────────────────────────────────────

class TestQuizMission:
    def test_correct_answer_completes(self, setup):
        service, db, engine, client = setup
        db.start_onboarding("U1", "테스트")
        # join_channels, setup_notion 완료 → read_policy(퀴즈, 정답=1)
        db.complete_mission("U1", "join_channels")
        db.complete_mission("U1", "setup_notion")

        service.answer_quiz(client, "U1", "read_policy", 1, "C1")
        assert "read_policy" in db.get_progress("U1")

    def test_wrong_answer_does_not_complete(self, setup):
        service, db, engine, client = setup
        db.start_onboarding("U1", "테스트")
        db.complete_mission("U1", "join_channels")
        db.complete_mission("U1", "setup_notion")

        service.answer_quiz(client, "U1", "read_policy", 0, "C1")
        assert "read_policy" not in db.get_progress("U1")

        # 오답 메시지 + 미션 재전송 = 2번
        calls = client.chat_postMessage.call_args_list
        texts = [c.kwargs.get("text", "") for c in calls]
        assert any("틀" in t or "다시" in t or "wrong" in t.lower() for t in texts)

    def test_quiz_records_attempt(self, setup):
        service, db, engine, client = setup
        db.start_onboarding("U1", "테스트")
        db.complete_mission("U1", "join_channels")
        db.complete_mission("U1", "setup_notion")

        service.answer_quiz(client, "U1", "read_policy", 0, "C1")
        service.answer_quiz(client, "U1", "read_policy", 0, "C1")
        assert db.get_attempts("U1", "read_policy") == 2


# ── 체크리스트 미션 ──────────────────────────────────

class TestChecklistMission:
    def test_partial_check_sends_remaining(self, setup):
        service, db, engine, client = setup
        db.start_onboarding("U1", "테스트")

        # join_channels 미션은 3개 항목: #all-공지사항, #all-운영, #all-무엇이든물어보살
        service.check_item(client, "U1", "join_channels", "#all-공지사항", "C1")
        assert "join_channels" not in db.get_progress("U1")

        # 남은 항목 수 메시지 확인
        last_call = client.chat_postMessage.call_args
        assert "남은 항목" in last_call.kwargs.get("text", "")

    def test_all_items_checked_completes_mission(self, setup):
        service, db, engine, client = setup
        db.start_onboarding("U1", "테스트")

        items = ["#all-공지사항", "#all-운영", "#all-무엇이든물어보살"]
        for item in items:
            service.check_item(client, "U1", "join_channels", item, "C1")

        assert "join_channels" in db.get_progress("U1")

    def test_duplicate_check_no_double_complete(self, setup):
        """모든 항목 체크 후 중복 체크 → 완료 메시지 중복 없음."""
        service, db, engine, client = setup
        db.start_onboarding("U1", "테스트")

        items = ["#all-공지사항", "#all-운영", "#all-무엇이든물어보살"]
        for item in items:
            service.check_item(client, "U1", "join_channels", item, "C1")

        count_after_complete = client.chat_postMessage.call_count

        # 이미 완료된 미션에 다시 체크
        service.check_item(client, "U1", "join_channels", "#all-공지사항", "C1")
        assert client.chat_postMessage.call_count == count_after_complete


# ── 전체 플로우 ──────────────────────────────────────

class TestFullFlow:
    def test_complete_all_missions(self, setup):
        """모든 미션 완료 시 전체 완료 처리 + HR 알림."""
        service, db, engine, client = setup
        db.start_onboarding("U1", "테스트유저")

        all_ids = engine.get_all_mission_ids()
        for mission_id in all_ids:
            mission = engine.get_mission(mission_id)
            if mission["type"] == "confirm":
                service.confirm_mission(client, "U1", mission_id, "C1")
            elif mission["type"] == "quiz":
                service.answer_quiz(client, "U1", mission_id, mission["answer"], "C1")
            elif mission["type"] == "checklist":
                for item in mission["items"]:
                    service.check_item(client, "U1", mission_id, item, "C1")

        user = db.get_user("U1")
        assert user["completed_at"] is not None

        # HR 알림 채널로 메시지 전송 확인
        hr_calls = [
            c for c in client.chat_postMessage.call_args_list
            if c.kwargs.get("channel") == "team-operation"
        ]
        assert len(hr_calls) >= 1

    def test_get_status_blocks(self, setup):
        service, db, engine, client = setup
        db.start_onboarding("U1", "김철수")
        db.complete_mission("U1", "join_channels")
        blocks = service.get_status_blocks()
        assert len(blocks) >= 2

    def test_initiate_for_user(self, setup):
        service, db, engine, client = setup
        client.conversations_open.return_value = {"channel": {"id": "D_DM"}}
        name = service.initiate_for_user(client, "U_NEW")
        assert name == "테스트유저"
        client.chat_postMessage.assert_called_once()
        assert client.chat_postMessage.call_args.kwargs["channel"] == "D_DM"
