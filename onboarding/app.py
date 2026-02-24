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
from src.message_builder import MessageBuilder

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
            text="온보딩을 모두 완료했습니다!",
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
    cat = engine.get_mission_category(mission["id"])
    prev_mission_ids = engine.get_all_mission_ids()
    idx = prev_mission_ids.index(mission["id"])
    if idx == 0 or engine.get_mission_category(prev_mission_ids[idx - 1])["id"] != cat["id"]:
        client.chat_postMessage(
            channel=channel,
            text=f"{cat.get('emoji', '📌')} {cat['name']}",
            blocks=MessageBuilder.category_intro(cat["name"], cat.get("emoji", "📌")),
        )

    db.update_current_mission(user_id, mission["id"])
    client.chat_postMessage(
        channel=channel,
        text=mission["title"],
        blocks=MessageBuilder.mission(mission),
    )


def _error_reply(client, channel: str, context: str):
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
    """DM 메시지 수신 — 봇이 보낸 메시지는 무시."""
    if event.get("bot_id"):
        return
    user_id = event["user"]
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
        user_id = body["user"]["id"]
        user_name = body["user"].get("name", body["user"]["id"])
        try:
            info = client.users_info(user=user_id)
            user_name = info["user"]["real_name"] or info["user"]["name"]
        except Exception:
            pass
        logger.info(f"온보딩 시작: user={user_id} name={user_name}")
        db.start_onboarding(user_id, user_name)
        client.chat_postMessage(
            channel=channel,
            text=f"좋아요 {user_name}님! 첫 번째 미션을 시작합니다 🚀",
        )
        send_next_mission(client, user_id, channel)
    except Exception as e:
        logger.exception(f"handle_start 에러: {e}")
        _error_reply(client, channel, str(e))


@app.action("resume_onboarding")
def handle_resume(ack, body, client):
    ack()
    channel = body["channel"]["id"]
    try:
        user_id = body["user"]["id"]
        logger.info(f"온보딩 이어하기: user={user_id}")
        send_next_mission(client, user_id, channel)
    except Exception as e:
        logger.exception(f"handle_resume 에러: {e}")
        _error_reply(client, channel, str(e))


@app.action(re.compile(r"^confirm_"))
def handle_confirm(ack, body, client):
    ack()
    channel = body["channel"]["id"]
    try:
        user_id = body["user"]["id"]
        action_id = body["actions"][0]["action_id"]
        mission_id = action_id.replace("confirm_", "")
        mission = engine.get_mission(mission_id)
        if not mission:
            return
        logger.info(f"미션 확인: user={user_id} mission={mission_id}")
        db.complete_mission(user_id, mission_id)
        client.chat_postMessage(
            channel=channel,
            text=mission.get("complete_message", "완료!"),
            blocks=MessageBuilder.mission_complete(mission.get("complete_message", "완료!")),
        )
        summary = engine.get_progress_summary(user_id)
        client.chat_postMessage(
            channel=channel,
            text=f"진행률: {summary['completed']}/{summary['total']}",
            blocks=MessageBuilder.progress_update(
                summary["completed"], summary["total"], summary["current_category"]
            ),
        )
        send_next_mission(client, user_id, channel)
    except Exception as e:
        logger.exception(f"handle_confirm 에러: {e}")
        _error_reply(client, channel, str(e))


@app.action(re.compile(r"^quiz_"))
def handle_quiz(ack, body, client):
    ack()
    channel = body["channel"]["id"]
    try:
        user_id = body["user"]["id"]
        action_id = body["actions"][0]["action_id"]
        parts = action_id.split("_")
        chosen = int(parts[-1])
        mission_id = "_".join(parts[1:-1])
        mission = engine.get_mission(mission_id)
        if not mission:
            return
        logger.info(f"퀴즈 응답: user={user_id} mission={mission_id} chosen={chosen}")
        db.record_attempt(user_id, mission_id)
        if chosen == mission["answer"]:
            db.complete_mission(user_id, mission_id)
            client.chat_postMessage(
                channel=channel,
                text=mission.get("complete_message", "정답!"),
                blocks=MessageBuilder.mission_complete(mission.get("complete_message", "정답!")),
            )
            summary = engine.get_progress_summary(user_id)
            client.chat_postMessage(
                channel=channel,
                text=f"진행률: {summary['completed']}/{summary['total']}",
                blocks=MessageBuilder.progress_update(
                    summary["completed"], summary["total"], summary["current_category"]
                ),
            )
            send_next_mission(client, user_id, channel)
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
    except Exception as e:
        logger.exception(f"handle_quiz 에러: {e}")
        _error_reply(client, channel, str(e))


@app.action(re.compile(r"^check_"))
def handle_checklist(ack, body, client):
    ack()
    channel = body["channel"]["id"]
    try:
        user_id = body["user"]["id"]
        action_id = body["actions"][0]["action_id"]
        value = body["actions"][0]["value"]
        prefix = "check_"
        suffix = f"_{value}"
        mission_id = action_id[len(prefix):]
        if mission_id.endswith(suffix):
            mission_id = mission_id[:-len(suffix)]
        mission = engine.get_mission(mission_id)
        if not mission:
            return
        logger.info(f"체크리스트: user={user_id} mission={mission_id} item={value}")
        db.record_attempt(user_id, f"{mission_id}__check__{value}")
        checked = set()
        for item in mission["items"]:
            attempts = db.get_attempts(user_id, f"{mission_id}__check__{item}")
            if attempts > 0:
                checked.add(item)
        if checked >= set(mission["items"]):
            db.complete_mission(user_id, mission_id)
            client.chat_postMessage(
                channel=channel,
                text=mission.get("complete_message", "완료!"),
                blocks=MessageBuilder.mission_complete(mission.get("complete_message", "완료!")),
            )
            summary = engine.get_progress_summary(user_id)
            client.chat_postMessage(
                channel=channel,
                text=f"진행률: {summary['completed']}/{summary['total']}",
                blocks=MessageBuilder.progress_update(
                    summary["completed"], summary["total"], summary["current_category"]
                ),
            )
            send_next_mission(client, user_id, channel)
        else:
            client.chat_postMessage(
                channel=channel,
                text=f"✅ {value} 체크! (남은 항목: {len(mission['items']) - len(checked)}개)",
            )
    except Exception as e:
        logger.exception(f"handle_checklist 에러: {e}")
        _error_reply(client, channel, str(e))


# ── 슬래시 커맨드 ────────────────────────────────────

@app.command("/onboarding-status")
def handle_status(ack, respond, client):
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
    respond(blocks=blocks, text="온보딩 현황")


@app.command("/onboarding-start")
def handle_start_command(ack, body, respond, client):
    """HR이 /onboarding-start @유저 로 온보딩을 시작시킨다."""
    ack()
    text = body.get("text", "").strip()
    logger.info(f"/onboarding-start 수신 text='{text}'")
    # Slack 멘션 형식: <@U12345|name> 또는 <@U12345>
    match = re.search(r"<@([UW][A-Za-z0-9]+)", text)
    target_user_id = None
    if match:
        target_user_id = match.group(1)
    else:
        # 텍스트로 입력한 경우 (@name 또는 name) → users.list에서 검색
        search_name = text.lstrip("@").strip()
        if search_name:
            try:
                result = client.users_list()
                for member in result["members"]:
                    if member.get("deleted") or member.get("is_bot"):
                        continue
                    if (search_name.lower() in (member.get("name", "").lower(),
                                                 member.get("real_name", "").lower(),
                                                 member.get("profile", {}).get("display_name", "").lower())):
                        target_user_id = member["id"]
                        break
            except Exception as e:
                logger.warning(f"유저 검색 실패: {e}")
    if not target_user_id:
        respond(text="유저를 찾을 수 없어요. `/onboarding-start @신규입사자` 형태로 입력해주세요.")
        return
    try:
        info = client.users_info(user=target_user_id)
        user_name = info["user"]["real_name"] or info["user"]["name"]
    except Exception:
        user_name = target_user_id
    try:
        dm = client.conversations_open(users=[target_user_id])
        dm_channel = dm["channel"]["id"]
        welcome_text = engine.settings.get("welcome_message", "온보딩을 시작합니다!")
        client.chat_postMessage(
            channel=dm_channel,
            text=welcome_text,
            blocks=MessageBuilder.welcome(welcome_text),
        )
        logger.info(f"온보딩 메시지 발송: user={target_user_id} channel={dm_channel}")
        respond(text=f"✅ {user_name}님에게 온보딩 메시지를 발송했습니다.")
    except Exception as e:
        logger.exception(f"온보딩 발송 실패: {e}")
        respond(text=f"❌ 발송 실패: {e}")


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
