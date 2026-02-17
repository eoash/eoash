"""
보낸 이메일 확인
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


def check_sent_emails(to_email: str = None, hours: int = 24):
    """보낸 이메일 확인"""
    print("=" * 70)
    print(f"📤 보낸 이메일 확인 - {datetime.now().strftime('%Y-%m-%d')}")
    print("=" * 70)
    print()

    try:
        gmail = GmailClient()

        # 보낸 메일함 검색
        query = "in:sent"

        if to_email:
            query += f" to:{to_email}"

        # 시간 범위 추가
        if hours:
            since = datetime.now()
            since = since.replace(hour=0, minute=0, second=0, microsecond=0)
            if hours <= 24:
                query += f" after:{since.strftime('%Y/%m/%d')}"

        print(f"🔍 검색: {query}\n")

        messages = gmail.list_messages(query=query, max_results=20)

        if not messages:
            print("📭 보낸 이메일이 없습니다.\n")
            return

        print(f"📬 총 {len(messages)}개 이메일\n")
        print("-" * 70)

        for i, msg in enumerate(messages, 1):
            email = gmail.get_message(msg['id'])
            headers = {h['name']: h['value'] for h in email.get('payload', {}).get('headers', [])}

            to = headers.get('To', 'Unknown')
            subject = headers.get('Subject', '(제목 없음)')
            date_str = headers.get('Date', '')

            # 날짜 파싱
            try:
                from email.utils import parsedate_to_datetime
                date = parsedate_to_datetime(date_str)
                time_str = date.strftime('%m/%d %H:%M')
            except:
                time_str = date_str

            # 수신자 간단하게 표시
            if '<' in to:
                to_name = to.split('<')[0].strip().strip('"')
                to_email_addr = to.split('<')[1].strip('>')
                to_display = f"{to_name} <{to_email_addr}>"
            else:
                to_display = to

            print(f"{i}. [{time_str}] → {to_display}")
            print(f"   📝 {subject}")
            print()

        print("-" * 70)

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    # 커맨드라인 인자 처리
    to_email = None
    hours = 24

    if len(sys.argv) > 1:
        to_email = sys.argv[1]

    if len(sys.argv) > 2:
        hours = int(sys.argv[2])

    check_sent_emails(to_email, hours)
