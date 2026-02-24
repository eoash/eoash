"""EO Studio 온보딩 챗봇 — Slack Bolt 앱."""

import logging
import logging.handlers
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

from src.db_manager import DBManager
from src.mission_engine import MissionEngine
from src.onboarding_service import OnboardingService

# 환경 변수 로드
load_dotenv()

# 로깅 — 콘솔 + 파일
BASE_DIR = Path(__file__).parent
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.handlers.RotatingFileHandler(
            LOG_DIR / "chatbot.log", maxBytes=5_000_000, backupCount=3, encoding="utf-8"
        ),
    ],
)
logger = logging.getLogger(__name__)

# 초기화
db = DBManager(str(BASE_DIR / "db" / "onboarding.db"))
engine = MissionEngine(str(BASE_DIR / "missions.yaml"), db)
service = OnboardingService(db, engine)

app = App(token=os.environ["SLACK_BOT_TOKEN"])


def _error_reply(client, channel: str, context: str) -> None:
    """핸들러 에러 시 사용자에게 알림."""
    try:
        client.chat_postMessage(
            channel=channel,
            text=f"⚠️ 오류가 발생했어요. 잠시 후 다시 시도해주세요.\n(에러: {context})",
        )
    except Exception:
        pass


# ── 이벤트 핸들러 ────────────────────────────────────

@app.event("message")
def handle_dm(event, client):
    """DM 메시지 수신 — 봇 메시지 무시, 등록 유저만."""
    if event.get("bot_id"):
        return
    user_id = event.get("user")
    if not user_id:
        return
    channel = event["channel"]
    user = db.get_user(user_id)
    if user is None:
        return
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
    channel = body["channel"]["id"]
    try:
        service.start(client, body["user"]["id"], channel)
    except Exception as e:
        logger.exception("handle_start 에러")
        _error_reply(client, channel, str(e))


@app.action("resume_onboarding")
def handle_resume(ack, body, client):
    ack()
    channel = body["channel"]["id"]
    try:
        service.resume(client, body["user"]["id"], channel)
    except Exception as e:
        logger.exception("handle_resume 에러")
        _error_reply(client, channel, str(e))


@app.action(re.compile(r"^confirm_"))
def handle_confirm(ack, body, client):
    ack()
    channel = body["channel"]["id"]
    try:
        user_id = body["user"]["id"]
        mission_id = body["actions"][0]["action_id"].removeprefix("confirm_")
        service.confirm_mission(client, user_id, mission_id, channel)
    except Exception as e:
        logger.exception("handle_confirm 에러")
        _error_reply(client, channel, str(e))


@app.action(re.compile(r"^quiz_"))
def handle_quiz(ack, body, client):
    ack()
    channel = body["channel"]["id"]
    try:
        user_id = body["user"]["id"]
        action_id = body["actions"][0]["action_id"]
        body_part, _, chosen_str = action_id.removeprefix("quiz_").rpartition("_")
        service.answer_quiz(client, user_id, body_part, int(chosen_str), channel)
    except Exception as e:
        logger.exception("handle_quiz 에러")
        _error_reply(client, channel, str(e))


@app.action(re.compile(r"^check_"))
def handle_checklist(ack, body, client):
    ack()
    channel = body["channel"]["id"]
    try:
        user_id = body["user"]["id"]
        action_id = body["actions"][0]["action_id"]
        value = body["actions"][0]["value"]
        mission_id, _, _ = action_id.removeprefix("check_").rpartition(f"_{value}")
        service.check_item(client, user_id, mission_id, value, channel)
    except Exception as e:
        logger.exception("handle_checklist 에러")
        _error_reply(client, channel, str(e))


# ── 슬래시 커맨드 ────────────────────────────────────

@app.command("/onboarding-status")
def handle_status(ack, respond, client):
    ack()
    respond(blocks=service.get_status_blocks(), text="온보딩 현황")


@app.command("/onboarding-start")
def handle_start_command(ack, body, respond, client):
    """HR이 /onboarding-start @유저 로 온보딩을 시작시킨다."""
    ack()
    text = body.get("text", "").strip()
    logger.info("/onboarding-start 수신 text='%s'", text)

    target_user_id = _resolve_target_user(client, text)
    if not target_user_id:
        respond(text="유저를 찾을 수 없어요. `/onboarding-start @신규입사자` 형태로 입력해주세요.")
        return
    try:
        user_name = service.initiate_for_user(client, target_user_id)
        respond(text=f"✅ {user_name}님에게 온보딩 메시지를 발송했습니다.")
    except Exception as e:
        logger.exception("온보딩 발송 실패")
        respond(text=f"❌ 발송 실패: {e}")

@app.command("/onboarding-reset")
def handle_reset_command(ack, body, respond, client):
    """HR이 /onboarding-reset @유저 로 온보딩 진행을 초기화한다."""
    ack()
    text = body.get("text", "").strip()
    logger.info("/onboarding-reset 수신 text='%s'", text)

    target_user_id = _resolve_target_user(client, text)
    if not target_user_id:
        respond(text="유저를 알 수 없어요. `/onboarding-reset @유저` 형태로 입력해주세요.")
        return
    try:
        user_name = service.reset_user(client, target_user_id, None)
        respond(text=f"♻️ {user_name}님의 온보딩 진행이 초기화되었습니다.\n`/onboarding-start @{user_name}`로 다시 시작하세요.")
    except Exception as e:
        logger.exception("온보딩 리셋 실패")
        respond(text=f"❌ 리셋 실패: {e}")


def _resolve_target_user(client, text: str) -> str | None:
    """슬래시 커맨드 텍스트에서 타겟 유저 ID 추출."""
    # Slack 멘션 형식: <@U12345|name> 또는 <@U12345>
    match = re.search(r"<@([UW][A-Za-z0-9]+)", text)
    if match:
        return match.group(1)

    # 텍스트로 입력한 경우 → users.list에서 검색
    search_name = text.lstrip("@").strip()
    if not search_name:
        return None
    try:
        cursor = None
        while True:
            kwargs: dict = {"limit": 200}
            if cursor:
                kwargs["cursor"] = cursor
            result = client.users_list(**kwargs)
            for member in result["members"]:
                if member.get("deleted") or member.get("is_bot"):
                    continue
                names = (
                    member.get("name", "").lower(),
                    member.get("real_name", "").lower(),
                    member.get("profile", {}).get("display_name", "").lower(),
                )
                if search_name.lower() in names:
                    return member["id"]
            cursor = result.get("response_metadata", {}).get("next_cursor")
            if not cursor:
                break
    except Exception:
        logger.warning("유저 검색 실패: search_name=%s", search_name)
    return None


# ── 메인 ─────────────────────────────────────────────

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
    logger.info("Socket Mode 연결 중...")
    handler.start()
