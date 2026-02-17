"""
Check emails from 정호석 and 강유진 lawyers on 2026-02-10
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ash_bot.integrations.gmail_client import GmailClient

def main():
    print("=" * 60)
    print("정호석/강유진 변호사 이메일 확인 (2026-02-10)")
    print("=" * 60)

    # Initialize Gmail client
    client = GmailClient()

    # Search for emails on 2026-02-10
    query = "after:2026/02/10 before:2026/02/11"
    messages = client.search_messages(query=query, max_results=100)

    print(f"\n[검색 결과] 2026-02-10에 받은 이메일: {len(messages)}개")

    # Filter by lawyer names
    lawyer_emails = []
    for msg in messages:
        from_field = msg['from'].lower()
        if '정호석' in msg['from'] or '강유진' in msg['from'] or \
           'jeong ho seok' in from_field or 'kang yu jin' in from_field or \
           'ho seok' in from_field or 'yu jin' in from_field:
            lawyer_emails.append(msg)

    print(f"\n[결과] 정호석/강유진 변호사 이메일: {len(lawyer_emails)}개")

    if lawyer_emails:
        print("\n" + "=" * 60)
        print("발견된 이메일:")
        print("=" * 60)

        for i, msg in enumerate(lawyer_emails, 1):
            from_safe = msg['from'].encode('cp949', errors='replace').decode('cp949')
            subject_safe = msg['subject'].encode('cp949', errors='replace').decode('cp949')
            body_preview = msg['body'][:500].encode('cp949', errors='replace').decode('cp949')

            print(f"\n[{i}] ================")
            print(f"발신: {from_safe}")
            print(f"제목: {subject_safe}")
            print(f"날짜: {msg['date'].strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"\n[본문 미리보기]")
            print(body_preview)
            print("\n...")
    else:
        print("\n[알림] 정호석/강유진 변호사로부터 온 이메일을 찾지 못했습니다.")
        print("\n다른 발신자 확인을 위해 2026-02-10의 모든 이메일 목록:")
        print("=" * 60)

        for i, msg in enumerate(messages[:20], 1):  # Show first 20
            from_safe = msg['from'].encode('cp949', errors='replace').decode('cp949')
            subject_safe = msg['subject'].encode('cp949', errors='replace').decode('cp949')

            print(f"\n[{i}] 발신: {from_safe}")
            print(f"    제목: {subject_safe}")
            print(f"    날짜: {msg['date'].strftime('%Y-%m-%d %H:%M:%S')}")

    print("\n" + "=" * 60)

if __name__ == '__main__':
    main()
