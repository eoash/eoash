"""온보딩 비즈니스 로직 서비스 레이어.

핸들러에서 비즈니스 로직을 분리하여 테스트 가능성 및 가독성 향상.
모든 Slack 메시지 전송과 DB 업데이트 오케스트레이션을 담당.
"""

import logging
from typing import Any

from src.db_manager import DBManager
from src.mission_engine import MissionEngine
from src.message_builder import MessageBuilder

logger = logging.getLogger(__name__)


class OnboardingService:
    def __init__(self, db: DBManager, engine: MissionEngine):
        self.db = db
        self.engine = engine

    # ── 핵심 플로우 ────────────────────────────────────

    def start(self, client: Any, user_id: str, channel: str) -> None:
        """온보딩 시작. 유저 이름 조회 → DB 등록 → 첫 미션 전송."""
        user_name = self._resolve_user_name(client, user_id)
        logger.info("온보딩 시작: user=%s name=%s", user_id, user_name)
        self.db.start_onboarding(user_id, user_name)
        client.chat_postMessage(
            channel=channel,
            text=f"좋아요 {user_name}님! 첫 번째 미션을 시작합니다 🚀",
        )
        self._send_next_mission(client, user_id, channel)

    def resume(self, client: Any, user_id: str, channel: str) -> None:
        """온보딩 이어하기."""
        logger.info("온보딩 이어하기: user=%s", user_id)
        self._send_next_mission(client, user_id, channel)

    def confirm_mission(self, client: Any, user_id: str, mission_id: str, channel: str) -> None:
        """confirm 타입 미션 완료 처리."""
        mission = self.engine.get_mission(mission_id)
        if not mission:
            return
        logger.info("미션 확인: user=%s mission=%s", user_id, mission_id)
        if not self.db.complete_mission(user_id, mission_id):
            return  # 이미 완료됨 — 중복 클릭 방어
        self._notify_mission_complete(client, channel, mission)
        self._send_progress(client, user_id, channel)
        self._send_next_mission(client, user_id, channel)

    def answer_quiz(self, client: Any, user_id: str, mission_id: str, chosen: int, channel: str) -> None:
        """퀴즈 미션 답변 처리."""
        mission = self.engine.get_mission(mission_id)
        if not mission:
            return
        logger.info("퀴즈 응답: user=%s mission=%s chosen=%d", user_id, mission_id, chosen)
        self.db.record_attempt(user_id, mission_id)

        if chosen == mission["answer"]:
            if not self.db.complete_mission(user_id, mission_id):
                return  # 이미 완료됨
            self._notify_mission_complete(client, channel, mission)
            self._send_progress(client, user_id, channel)
            self._send_next_mission(client, user_id, channel)
        else:
            client.chat_postMessage(
                channel=channel,
                text=mission.get("wrong_message", "틀렸어요! 다시 시도해보세요."),
                blocks=MessageBuilder.mission_wrong(
                    mission.get("wrong_message", "틀렸어요! 다시 시도해보세요.")
                ),
            )
            client.chat_postMessage(
                channel=channel,
                text=mission["title"],
                blocks=MessageBuilder.mission(mission),
            )

    def check_item(self, client: Any, user_id: str, mission_id: str, item: str, channel: str) -> None:
        """체크리스트 항목 체크 처리. 원자적 완료 체크로 레이스 컨디션 방어."""
        mission = self.engine.get_mission(mission_id)
        if not mission:
            return
        logger.info("체크리스트: user=%s mission=%s item=%s", user_id, mission_id, item)

        # 이미 완료된 미션이면 무시
        if mission_id in self.db.get_progress(user_id):
            return

        self.db.record_attempt(user_id, f"{mission_id}__check__{item}")

        # 모든 항목 체크 여부 확인
        checked = set()
        for checklist_item in mission["items"]:
            if self.db.get_attempts(user_id, f"{mission_id}__check__{checklist_item}") > 0:
                checked.add(checklist_item)

        if checked >= set(mission["items"]):
            # complete_mission이 False 반환 → 다른 스레드가 먼저 완료 처리함
            if not self.db.complete_mission(user_id, mission_id):
                return
            self._notify_mission_complete(client, channel, mission)
            self._send_progress(client, user_id, channel)
            self._send_next_mission(client, user_id, channel)
        else:
            remaining = len(mission["items"]) - len(checked)
            client.chat_postMessage(
                channel=channel,
                text=f"✅ {item} 체크! (남은 항목: {remaining}개)",
            )

    def get_status_blocks(self) -> list[dict]:
        """HR 현황 대시보드 블록 반환."""
        all_users = self.db.get_all_users()
        all_progress = self.db.get_all_progress()
        total = len(self.engine.get_all_mission_ids())
        user_data = [
            {
                "user_name": u["user_name"],
                "completed_at": u["completed_at"],
                "completed": len(all_progress.get(u["user_id"], set())),
                "total": total,
            }
            for u in all_users
        ]
        return MessageBuilder.hr_status(user_data)

    def initiate_for_user(self, client: Any, target_user_id: str) -> str:
        """HR이 특정 유저에게 온보딩 시작 메시지 발송. 유저 이름 반환."""
        user_name = self._resolve_user_name(client, target_user_id)
        dm = client.conversations_open(users=[target_user_id])
        dm_channel = dm["channel"]["id"]
        welcome_text = self.engine.settings.get("welcome_message", "온보딩을 시작합니다!")
        client.chat_postMessage(
            channel=dm_channel,
            text=welcome_text,
            blocks=MessageBuilder.welcome(welcome_text),
        )
        logger.info("온보딩 메시지 발송: user=%s channel=%s", target_user_id, dm_channel)
        return user_name

    def reset_user(self, client: Any, target_user_id: str, channel: str | None = None) -> str:
        """HR이 특정 유저의 온보딩 진행을 리셋한다. 유저 이름 반환."""
        user = self.db.get_user(target_user_id)
        user_name = user["user_name"] if user else self._resolve_user_name(client, target_user_id)
        self.db.reset_user(target_user_id)
        logger.info("온보딩 리셋: user=%s name=%s", target_user_id, user_name)
        return user_name

    # ── 내부 헬퍼 ──────────────────────────────────────

    def _send_next_mission(self, client: Any, user_id: str, channel: str) -> None:
        """다음 미션 전송 또는 전체 완료 처리."""
        mission = self.engine.get_next_mission(user_id)
        if mission is None:
            self._complete_all(client, user_id, channel)
            return
        self._send_category_intro_if_needed(client, mission, channel)
        self.db.update_current_mission(user_id, mission["id"])
        client.chat_postMessage(
            channel=channel,
            text=mission["title"],
            blocks=MessageBuilder.mission(mission),
        )

    def _complete_all(self, client: Any, user_id: str, channel: str) -> None:
        """전체 온보딩 완료 처리 — 축하 메시지 + HR 알림."""
        completion_msg = self.engine.settings.get("completion_message", "온보딩 완료!")
        client.chat_postMessage(
            channel=channel,
            text="온보딩을 모두 완료했습니다!",
            blocks=MessageBuilder.all_complete(completion_msg),
        )
        self.db.complete_onboarding(user_id)

        # HR 알림
        user = self.db.get_user(user_id)
        hr_channel = self.engine.settings.get("hr_notify_channel", "hr-ops")
        try:
            user_name = user["user_name"] if user else user_id
            client.chat_postMessage(
                channel=hr_channel,
                text=f"🎉 {user_name}님이 온보딩을 완료했습니다!",
            )
        except Exception:
            logger.warning("HR 알림 실패: channel=%s user=%s", hr_channel, user_id)

    def _send_category_intro_if_needed(self, client: Any, mission: dict, channel: str) -> None:
        """카테고리가 바뀌면 카테고리 소개 메시지 전송."""
        cat = self.engine.get_mission_category(mission["id"])
        all_ids = self.engine.get_all_mission_ids()
        idx = all_ids.index(mission["id"])
        if idx == 0 or self.engine.get_mission_category(all_ids[idx - 1])["id"] != cat["id"]:
            client.chat_postMessage(
                channel=channel,
                text=f"{cat.get('emoji', '📌')} {cat['name']}",
                blocks=MessageBuilder.category_intro(cat["name"], cat.get("emoji", "📌")),
            )

    def _send_progress(self, client: Any, user_id: str, channel: str) -> None:
        """진행률 업데이트 전송."""
        summary = self.engine.get_progress_summary(user_id)
        client.chat_postMessage(
            channel=channel,
            text=f"진행률: {summary['completed']}/{summary['total']}",
            blocks=MessageBuilder.progress_update(
                summary["completed"], summary["total"], summary["current_category"]
            ),
        )

    def _notify_mission_complete(self, client: Any, channel: str, mission: dict) -> None:
        """미션 완료 메시지 전송."""
        msg = mission.get("complete_message", "완료!")
        client.chat_postMessage(
            channel=channel,
            text=msg,
            blocks=MessageBuilder.mission_complete(msg),
        )

    @staticmethod
    def _resolve_user_name(client: Any, user_id: str) -> str:
        """Slack API로 유저 실명 조회. 실패 시 user_id 반환."""
        try:
            info = client.users_info(user=user_id)
            return info["user"]["real_name"] or info["user"]["name"]
        except Exception:
            return user_id
