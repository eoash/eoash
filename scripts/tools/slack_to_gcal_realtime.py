"""
Slack 이모지 반응 실시간 감지 → Google Calendar 자동 초대 (Socket Mode)
Usage: python scripts/tools/slack_to_gcal_realtime.py --slack "[링크]" --cal "[링크]"
"""
import os
import sys
import io
import re
import json
import base64
import argparse
from pathlib import Path
from dotenv import load_dotenv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

load_dotenv(Path(__file__).parents[2] / ".env")

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_APP_TOKEN = os.getenv("SLACK_APP_TOKEN")


# ── 링크 파싱 ──────────────────────────────────────────────────────────────
def parse_slack_link(url: str) -> tuple[str, str]:
    m = re.search(r'/archives/([A-Z0-9]+)/p(\d+)', url)
    if not m:
        print(f"❌ Slack 링크 파싱 실패: {url}")
        sys.exit(1)
    channel = m.group(1)
    ts_raw = m.group(2)
    ts = ts_raw[:-6] + "." + ts_raw[-6:]
    return channel, ts


def parse_cal_link(url: str) -> tuple[str, str]:
    m = re.search(r'/eventedit/([A-Za-z0-9+/=_-]+)', url)
    if not m:
        print(f"❌ Calendar 링크 파싱 실패: {url}")
        sys.exit(1)
    encoded = m.group(1).replace('-', '+').replace('_', '/')
    encoded += '=' * (4 - len(encoded) % 4)
    try:
        decoded = base64.b64decode(encoded).decode()
        parts = decoded.strip().split(' ')
        return parts[0], parts[1] if len(parts) > 1 else "primary"
    except Exception:
        return m.group(1), "primary"


# ── Google Calendar ────────────────────────────────────────────────────────
def get_calendar_service():
    import google.auth
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build

    SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
    creds, _ = google.auth.default(scopes=SCOPES)
    creds.refresh(Request())
    return build("calendar", "v3", credentials=creds)


def invite_to_calendar(service, event_id: str, calendar_id: str, name: str, email: str) -> bool:
    """캘린더 이벤트에 참석자 추가. 이미 있으면 False 반환."""
    event = service.events().get(calendarId=calendar_id, eventId=event_id).execute()
    existing_emails = {a["email"] for a in event.get("attendees", [])}

    if email in existing_emails:
        return False

    new_attendees = event.get("attendees", []) + [{"email": email, "displayName": name}]
    service.events().patch(
        calendarId=calendar_id,
        eventId=event_id,
        body={"attendees": new_attendees},
        sendUpdates="all"
    ).execute()
    return True


# ── Slack 유저 이메일 조회 ─────────────────────────────────────────────────
def get_user_email(client, user_id: str) -> tuple[str, str]:
    """(name, email) 반환. 이메일 없으면 ("", "") 반환."""
    res = client.users_profile_get(user=user_id)
    if res["ok"]:
        p = res["profile"]
        return p.get("real_name", user_id), p.get("email", "")
    return user_id, ""


# ── 메인 ──────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Slack 반응 실시간 감지 → Calendar 초대")
    parser.add_argument("--slack", help="Slack 메시지 링크")
    parser.add_argument("--cal", help="Google Calendar 이벤트 링크")
    args = parser.parse_args()

    if not args.slack:
        args.slack = input("Slack 메시지 링크: ").strip()
    if not args.cal:
        args.cal = input("Google Calendar 이벤트 링크: ").strip()

    channel, message_ts = parse_slack_link(args.slack)
    event_id, calendar_id = parse_cal_link(args.cal)

    print("=" * 52)
    print("  Slack 실시간 반응 → Google Calendar 초대")
    print("=" * 52)
    print(f"  채널: {channel}")
    print(f"  메시지: {message_ts}")
    print(f"  Ctrl+C로 종료")
    print("=" * 52)

    # Google Calendar 서비스 초기화
    cal_service = get_calendar_service()
    event = cal_service.events().get(calendarId=calendar_id, eventId=event_id).execute()
    print(f"\n📅 이벤트: {event.get('summary')}")
    print(f"   시간: {event.get('start', {}).get('dateTime', '?')}")
    print("\n👂 이모지 반응 대기 중...\n")

    # Socket Mode 앱 실행
    from slack_bolt import App
    from slack_bolt.adapter.socket_mode import SocketModeHandler

    app = App(token=SLACK_BOT_TOKEN)

    @app.event("reaction_added")
    def handle_reaction(event, say):
        # 지정한 메시지에 달린 반응만 처리
        item = event.get("item", {})
        if item.get("channel") != channel or item.get("ts") != message_ts:
            return

        user_id = event.get("user")
        emoji = event.get("reaction")
        name, email = get_user_email(app.client, user_id)

        if not email:
            print(f"  ⚠️  {name} — 이메일 없음, 건너뜀")
            return

        invited = invite_to_calendar(cal_service, event_id, calendar_id, name, email)
        if invited:
            print(f"  ✅ [{emoji}] {name} <{email}> → 캘린더 초대 완료!")
        else:
            print(f"  ⏭️  [{emoji}] {name} — 이미 초대됨")

    handler = SocketModeHandler(app, SLACK_APP_TOKEN)
    handler.start()


if __name__ == "__main__":
    main()
