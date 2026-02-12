#!/usr/bin/env python3
"""Simple test to send message to Slack channel."""

import sys
sys.path.insert(0, '/Users/ash/Documents/eoash')

from ash_bot.integrations.slack_client import SlackClient

# Initialize Slack client
slack_client = SlackClient()

# Test connection
print("🧪 Slack 봇 테스트\n")
print("1️⃣  연결 테스트 중...\n")
if slack_client.test_connection():
    print("✅ Slack 연결 성공!\n")
else:
    print("❌ Slack 연결 실패\n")
    sys.exit(1)

# Send test message to #request-썸네일 channel
print("2️⃣  #request-썸네일 채널에 메시지 보내는 중...\n")

channel = "C033Z5AC3FA"  # #request-썸네일 channel ID
text = "🎬 **썸네일 봇 테스트**\n\n이 메시지가 보이면 봇이 정상 작동합니다! ✅"

result = slack_client.send_message(channel, text)

if result:
    print("✅ 메시지 전송 성공!")
    print(f"\n채널: #request-썸네일")
    print(f"메시지: {text}")
else:
    print("❌ 메시지 전송 실패")
    sys.exit(1)

# Send test with blocks (formatting)
print("\n3️⃣  블록 포맷으로 테스트 메시지 보내는 중...\n")

blocks = [
    {
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": "🎬 *YouTube 썸네일 캡션 생성 봇*\n\n준비 완료! 다음 명령을 사용하세요:\n`/thumbnail 영상제목 | 키워드1,키워드2 | 타겟오디언스`"
        }
    },
    {
        "type": "divider"
    },
    {
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": "✅ 봇이 정상 작동합니다!"
        }
    }
]

result2 = slack_client.send_message(channel, "테스트 메시지 (블록 포맷)", blocks=blocks)

if result2:
    print("✅ 블록 메시지 전송 성공!")
else:
    print("❌ 블록 메시지 전송 실패")

print("\n" + "="*50)
print("테스트 완료! ✅")
print("="*50)
