"""
오늘 받은 이메일 확인
"""
import sys
import io
from pathlib import Path
from datetime import datetime

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from ash_bot.integrations.gmail_client import GmailClient


def check_today_emails():
    """오늘 받은 이메일 확인"""
    print("=" * 70)
    print(f"📧 오늘 받은 이메일 - {datetime.now().strftime('%Y-%m-%d (%A)')}")
    print("=" * 70)
    print()

    try:
        gmail = GmailClient()
        print("✅ Gmail 연결 성공\n")

        # 오늘 날짜로 검색
        today = datetime.now().strftime('%Y/%m/%d')
        query = f'after:{today} in:inbox'

        # 이메일 목록 조회
        messages = gmail.list_messages(query=query, max_results=50)

        if not messages:
            print("📭 오늘 받은 이메일이 없습니다.\n")
            return

        print(f"📬 총 {len(messages)}개 이메일\n")
        print("-" * 70)

        for i, msg in enumerate(messages, 1):
            # 이메일 상세 정보 조회
            email = gmail.get_message(msg['id'])

            # 헤더에서 정보 추출
            headers = {h['name']: h['value'] for h in email.get('payload', {}).get('headers', [])}

            sender = headers.get('From', 'Unknown')
            subject = headers.get('Subject', '(제목 없음)')
            date_str = headers.get('Date', '')

            # 날짜 파싱
            try:
                # RFC 2822 형식 파싱
                from email.utils import parsedate_to_datetime
                date = parsedate_to_datetime(date_str)
                time_str = date.strftime('%H:%M')
            except:
                time_str = date_str

            # 발신자 간단하게 표시
            if '<' in sender:
                sender_name = sender.split('<')[0].strip().strip('"')
                sender_email = sender.split('<')[1].strip('>')
                sender_display = f"{sender_name} <{sender_email}>"
            else:
                sender_display = sender

            # 읽음/안읽음 표시
            labels = email.get('labelIds', [])
            unread = '🔴' if 'UNREAD' in labels else '  '

            print(f"{i}. {unread} [{time_str}] {sender_display}")
            print(f"   📝 {subject}")
            print()

        print("-" * 70)
        print(f"\n총 {len(messages)}개 이메일 (🔴 = 안 읽음)")
        print()

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    check_today_emails()
