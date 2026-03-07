"""
Slack 이모지 반응자 → Google Calendar 초대 자동화
Usage: python scripts/tools/slack_to_gcal.py
"""
import os
import sys
import json
import io
from pathlib import Path
from dotenv import load_dotenv

# Windows CP949 인코딩 문제 해결
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

load_dotenv(Path(__file__).parents[2] / ".env")

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")


def parse_args():
    """Slack 링크 + Google Calendar 링크를 인자로 받거나 대화형으로 입력받기"""
    import argparse
    parser = argparse.ArgumentParser(
        description="Slack 이모지 반응자 → Google Calendar 초대",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python slack_to_gcal.py \\
    --slack "https://eo2019.slack.com/archives/C01N15328HG/p1772186298231169" \\
    --cal "https://calendar.google.com/calendar/u/0/r/eventedit/NGhwY3Y4..."
        """
    )
    parser.add_argument("--slack", help="Slack 메시지 링크")
    parser.add_argument("--cal", help="Google Calendar 이벤트 링크")
    args = parser.parse_args()

    # 인자 없으면 대화형으로 입력
    if not args.slack:
        args.slack = input("Slack 메시지 링크를 붙여넣으세요: ").strip()
    if not args.cal:
        args.cal = input("Google Calendar 이벤트 링크를 붙여넣으세요: ").strip()

    return args


def parse_slack_link(url: str) -> tuple[str, str]:
    """Slack 링크에서 channel, message_ts 추출"""
    import re
    m = re.search(r'/archives/([A-Z0-9]+)/p(\d+)', url)
    if not m:
        print(f"❌ Slack 링크 파싱 실패: {url}")
        sys.exit(1)
    channel = m.group(1)
    ts_raw = m.group(2)
    ts = ts_raw[:-6] + "." + ts_raw[-6:]  # 1772186298231169 → 1772186298.231169
    return channel, ts


def parse_cal_link(url: str) -> tuple[str, str]:
    """Google Calendar 링크에서 event_id, calendar_id 추출"""
    import base64, re
    m = re.search(r'/eventedit/([A-Za-z0-9+/=_-]+)', url)
    if not m:
        print(f"❌ Calendar 링크 파싱 실패: {url}")
        sys.exit(1)
    encoded = m.group(1)
    # URL-safe base64 → standard base64
    encoded = encoded.replace('-', '+').replace('_', '/')
    encoded += '=' * (4 - len(encoded) % 4)
    try:
        decoded = base64.b64decode(encoded).decode()
        # 형식: "event_id calendar_id" 또는 "event_id"
        parts = decoded.strip().split(' ')
        event_id = parts[0]
        calendar_id = parts[1] if len(parts) > 1 else "primary"
    except Exception:
        # 디코딩 실패 시 그대로 event_id로 사용
        event_id = m.group(1)
        calendar_id = "primary"
    return event_id, calendar_id

# ── Slack: 반응자 이메일 수집 ──────────────────────────────────────────────
def get_reactors_emails(channel: str, message_ts: str) -> list[dict]:
    """이모지 반응한 사람들의 이름 + 이메일 반환"""
    import urllib.request

    def slack_api(method, params={}):
        import urllib.parse
        url = f"https://slack.com/api/{method}?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}"})
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read())

    # 1. 메시지의 모든 반응 조회
    print(f"📨 Slack 메시지 반응 조회 중... (channel={channel}, ts={message_ts})")
    data = slack_api("reactions.get", {
        "channel": channel,
        "timestamp": message_ts,
        "full": "true"
    })

    if not data.get("ok"):
        print(f"❌ Slack API 오류: {data.get('error')}")
        sys.exit(1)

    msg = data.get("message", {})
    reactions = msg.get("reactions", [])

    if not reactions:
        print("⚠️  아직 이모지 반응이 없습니다.")
        return []

    # 2. 반응한 모든 유저 ID 수집 (중복 제거)
    user_ids = set()
    for reaction in reactions:
        emoji = reaction["name"]
        users = reaction["users"]
        print(f"  :{emoji}: → {len(users)}명: {users}")
        user_ids.update(users)

    print(f"\n✅ 총 {len(user_ids)}명이 반응했습니다.")

    # 3. 각 유저의 이메일 조회
    result = []
    for uid in user_ids:
        profile = slack_api("users.profile.get", {"user": uid})
        if profile.get("ok"):
            p = profile["profile"]
            email = p.get("email", "")
            name = p.get("real_name", uid)
            if email:
                result.append({"name": name, "email": email, "slack_id": uid})
                print(f"  ✓ {name} <{email}>")
            else:
                print(f"  ⚠️  {name} — 이메일 없음 (Bot 또는 게스트 계정)")
        else:
            print(f"  ⚠️  {uid} — 프로필 조회 실패: {profile.get('error')}")

    return result


# ── Google Calendar: 참석자 추가 ──────────────────────────────────────────
def add_to_gcal(attendees: list[dict], event_id: str, calendar_id: str):
    """Google Calendar 이벤트에 참석자 추가"""
    import google.auth
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build

    SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
    creds, _ = google.auth.default(scopes=SCOPES)
    creds.refresh(Request())
    service = build("calendar", "v3", credentials=creds)

    # 현재 이벤트 조회
    event = service.events().get(
        calendarId=calendar_id,
        eventId=event_id
    ).execute()

    print(f"\n📅 이벤트: {event.get('summary', '(제목 없음)')}")
    print(f"   시간: {event.get('start', {}).get('dateTime', '?')}")

    # 기존 참석자 + 새 참석자 합치기 (이메일 중복 제거)
    existing = event.get("attendees", [])
    existing_emails = {a["email"] for a in existing}

    new_attendees = []
    skipped = []
    for person in attendees:
        if person["email"] in existing_emails:
            skipped.append(person)
        else:
            new_attendees.append({"email": person["email"], "displayName": person["name"]})

    if skipped:
        print(f"\n⏭️  이미 초대된 사람 ({len(skipped)}명):")
        for p in skipped:
            print(f"   - {p['name']} <{p['email']}>")

    if not new_attendees:
        print("\n✅ 새로 추가할 사람이 없습니다. 모두 이미 초대되어 있어요.")
        return

    print(f"\n➕ 새로 초대할 사람 ({len(new_attendees)}명):")
    for a in new_attendees:
        print(f"   - {a['displayName']} <{a['email']}>")

    confirm = input("\n이 사람들에게 Google Calendar 초대를 보낼까요? (y/n): ").strip().lower()
    if confirm != "y":
        print("취소했습니다.")
        return

    event["attendees"] = existing + new_attendees
    updated = service.events().patch(
        calendarId=calendar_id,
        eventId=event_id,
        body={"attendees": event["attendees"]},
        sendUpdates="all"   # 초대 이메일 자동 발송
    ).execute()

    print(f"\n🎉 완료! {len(new_attendees)}명에게 캘린더 초대를 보냈습니다.")
    print(f"   이벤트 링크: {updated.get('htmlLink')}")


# ── 메인 ──────────────────────────────────────────────────────────────────
def main():
    print("=" * 50)
    print("  Slack 반응자 → Google Calendar 초대")
    print("=" * 50)

    args = parse_args()
    channel, message_ts = parse_slack_link(args.slack)
    event_id, calendar_id = parse_cal_link(args.cal)

    attendees = get_reactors_emails(channel, message_ts)
    if not attendees:
        return

    add_to_gcal(attendees, event_id, calendar_id)


if __name__ == "__main__":
    main()
