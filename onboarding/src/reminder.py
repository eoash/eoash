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
