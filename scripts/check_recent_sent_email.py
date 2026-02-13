"""
Check recently sent email from Seohyun Ahn
"""

import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ash_bot.integrations.gmail_client import GmailClient

def main():
    # Initialize Gmail client
    client = GmailClient()

    # Search for sent emails from today
    query = "from:ash@eoeoeo.net after:2026/02/10"
    messages = client.search_messages(query=query, max_results=10)

    if not messages:
        print("[알림] 오늘 보낸 이메일을 찾지 못했습니다.")
        return

    # Get the most recent one
    latest = messages[0]

    # Save to file
    output_dir = "email_output"
    os.makedirs(output_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{output_dir}/sent_email_{timestamp}.txt"

    with open(filename, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("최근 발신 이메일\n")
        f.write("=" * 80 + "\n\n")
        f.write(f"발신: {latest['from']}\n")
        f.write(f"수신: {latest['to']}\n")
        f.write(f"제목: {latest['subject']}\n")
        f.write(f"날짜: {latest['date'].strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("=" * 80 + "\n")
        f.write("이메일 본문:\n")
        f.write("=" * 80 + "\n\n")
        f.write(latest['body'])

    print(f"[성공] 최근 발신 이메일을 저장했습니다:")
    print(f"       {os.path.abspath(filename)}")
    print(f"\n제목: {latest['subject']}")
    print(f"수신: {latest['to']}")
    print(f"날짜: {latest['date'].strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == '__main__':
    main()
