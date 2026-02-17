"""
Read full email content from 정호석 lawyer on 2026-02-10
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ash_bot.integrations.gmail_client import GmailClient

def main():
    print("=" * 80)
    print("정호석 변호사 이메일 전체 내용")
    print("=" * 80)

    # Initialize Gmail client
    client = GmailClient()

    # Search for emails on 2026-02-10
    query = "after:2026/02/10 before:2026/02/11"
    messages = client.search_messages(query=query, max_results=100)

    # Find lawyer email
    lawyer_email = None
    for msg in messages:
        if '정호석' in msg['from'] or 'hoseok.jung@seumlaw.com' in msg['from'].lower():
            lawyer_email = msg
            break

    if not lawyer_email:
        print("[오류] 정호석 변호사 이메일을 찾지 못했습니다.")
        return

    # Display full email
    print(f"\n발신: {lawyer_email['from']}")
    print(f"수신: {lawyer_email['to']}")
    print(f"제목: {lawyer_email['subject']}")
    print(f"날짜: {lawyer_email['date'].strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"라벨: {', '.join(lawyer_email['labels'])}")

    print("\n" + "=" * 80)
    print("이메일 본문:")
    print("=" * 80)

    # Print full body
    body = lawyer_email['body']

    # Try to encode safely for Windows console
    try:
        # Replace problematic characters for display
        body_safe = body.replace('\r\n', '\n')
        print(body_safe)
    except UnicodeEncodeError:
        # Fallback: encode with replace
        body_safe = body.encode('cp949', errors='replace').decode('cp949')
        print(body_safe)

    print("\n" + "=" * 80)
    print(f"\n[총 길이: {len(body)} 문자]")

if __name__ == '__main__':
    main()
