"""
Test Gmail API connection and fetch recent emails
"""

import sys
import os
import logging

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ash_bot.integrations.gmail_client import GmailClient

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def main():
    """Test Gmail client"""
    print("=" * 60)
    print("Gmail API 테스트")
    print("=" * 60)

    try:
        # Initialize Gmail client
        print("\n[1] Gmail 클라이언트 초기화 중...")
        client = GmailClient()
        print("[OK] 초기화 완료!")

        # Get recent messages
        print("\n[2] 최근 7일 이메일 조회 중...")
        recent_messages = client.get_recent_messages(days=7, max_results=10)
        print(f"[OK] {len(recent_messages)}개 이메일 발견")

        # Display messages
        print("\n" + "=" * 60)
        print("최근 이메일 목록")
        print("=" * 60)

        for i, msg in enumerate(recent_messages, 1):
            # Safe encoding for Windows console
            from_safe = msg['from'].encode('cp949', errors='replace').decode('cp949')
            subject_safe = msg['subject'].encode('cp949', errors='replace').decode('cp949')
            snippet_safe = msg['snippet'][:80].encode('cp949', errors='replace').decode('cp949')

            print(f"\n[{i}] ID: {msg['id']}")
            print(f"    발신: {from_safe}")
            print(f"    제목: {subject_safe}")
            print(f"    날짜: {msg['date'].strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"    요약: {snippet_safe}...")

        # Get unread messages
        print("\n" + "=" * 60)
        print("[3] 읽지 않은 이메일 조회 중...")
        unread = client.get_unread_messages(max_results=5)
        print(f"[OK] {len(unread)}개 읽지 않은 이메일")

        if unread:
            print("\n읽지 않은 이메일:")
            for i, msg in enumerate(unread, 1):
                from_safe = msg['from'].encode('cp949', errors='replace').decode('cp949')
                subject_safe = msg['subject'].encode('cp949', errors='replace').decode('cp949')

                print(f"\n[{i}] 발신: {from_safe}")
                print(f"    제목: {subject_safe}")
                print(f"    날짜: {msg['date'].strftime('%Y-%m-%d %H:%M:%S')}")

        print("\n" + "=" * 60)
        print("[OK] 테스트 완료!")
        print("=" * 60)

    except Exception as e:
        logger.error(f"오류 발생: {e}", exc_info=True)
        print(f"\n[ERROR] 오류: {e}")
        return 1

    return 0


if __name__ == '__main__':
    sys.exit(main())
