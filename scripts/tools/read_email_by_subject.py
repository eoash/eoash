"""
특정 제목의 이메일 읽기
"""
import sys
import io
from pathlib import Path

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from ash_bot.integrations.gmail_client import GmailClient


def read_email_by_subject(subject_keyword: str):
    """제목으로 이메일 찾아서 읽기"""
    try:
        gmail = GmailClient()

        # 오늘 이메일 중에서 제목으로 검색
        from datetime import datetime
        today = datetime.now().strftime('%Y/%m/%d')
        query = f'after:{today} subject:"{subject_keyword}"'

        messages = gmail.list_messages(query=query, max_results=1)

        if not messages:
            print(f"'{subject_keyword}' 제목의 이메일을 찾을 수 없습니다.")
            return

        # 첫 번째 메시지 읽기
        email = gmail.get_message(messages[0]['id'])

        # 헤더 정보
        headers = {h['name']: h['value'] for h in email.get('payload', {}).get('headers', [])}

        print("=" * 70)
        print(f"발신: {headers.get('From', 'Unknown')}")
        print(f"제목: {headers.get('Subject', 'No subject')}")
        print(f"날짜: {headers.get('Date', 'Unknown')}")
        print("=" * 70)
        print()

        # 본문 읽기
        body = gmail.get_message_body(messages[0]['id'])
        print(body)
        print()

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("사용법: python read_email_by_subject.py <제목키워드>")
        sys.exit(1)

    read_email_by_subject(sys.argv[1])
