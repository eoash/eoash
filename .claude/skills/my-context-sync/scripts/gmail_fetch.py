"""
Gmail 메시지 수집 스크립트

기능: 최근 N일간의 받은편지함 메시지를 수집하여 JSON으로 출력
환경: credentials.json 파일 사용 (Google OAuth)
"""

import os
import json
import argparse
from datetime import datetime, timedelta
from pathlib import Path

# Google API 클라이언트 import
try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    print("⚠️  Google API 라이브러리가 설치되지 않았습니다.")
    print("설치: pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client")

# OAuth 스코프
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def get_gmail_service():
    """Gmail API 서비스 객체 생성"""
    creds = None
    token_path = Path('token.json')
    credentials_path = Path('credentials.json')

    # token.json 파일이 있으면 로드
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    # 유효한 credentials가 없으면 새로 인증
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not credentials_path.exists():
                raise FileNotFoundError(
                    "credentials.json 파일이 없습니다. "
                    "Google Cloud Console에서 OAuth 2.0 클라이언트 ID를 발급받아 저장하세요."
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                str(credentials_path), SCOPES
            )
            creds = flow.run_local_server(port=0)

        # token 저장
        with open(token_path, 'w') as token:
            token.write(creds.to_json())

    return build('gmail', 'v1', credentials=creds)

def fetch_recent_emails(days=7, max_results=50):
    """
    최근 N일간의 이메일 수집

    Args:
        days: 조회 기간 (일)
        max_results: 최대 결과 수

    Returns:
        list: 이메일 정보 리스트
    """
    if not GOOGLE_AVAILABLE:
        return []

    service = get_gmail_service()

    # 날짜 계산
    after_date = datetime.now() - timedelta(days=days)
    query = f'after:{after_date.strftime("%Y/%m/%d")}'

    # 메시지 목록 조회
    results = service.users().messages().list(
        userId='me',
        q=query,
        maxResults=max_results
    ).execute()

    messages = results.get('messages', [])

    if not messages:
        return []

    # 각 메시지 상세 정보 조회
    emails = []
    for message in messages:
        msg = service.users().messages().get(
            userId='me',
            id=message['id'],
            format='metadata',
            metadataHeaders=['From', 'To', 'Subject', 'Date']
        ).execute()

        # 헤더 파싱
        headers = {h['name']: h['value'] for h in msg['payload']['headers']}

        email_info = {
            'id': msg['id'],
            'from': headers.get('From', ''),
            'to': headers.get('To', ''),
            'subject': headers.get('Subject', ''),
            'date': headers.get('Date', ''),
            'snippet': msg.get('snippet', ''),
            'labels': msg.get('labelIds', []),
            'is_unread': 'UNREAD' in msg.get('labelIds', []),
            'is_important': 'IMPORTANT' in msg.get('labelIds', [])
        }

        emails.append(email_info)

    return emails

def main():
    parser = argparse.ArgumentParser(description='Gmail 메시지 수집')
    parser.add_argument('--days', type=int, default=7, help='조회 기간 (일)')
    parser.add_argument('--max-results', type=int, default=50, help='최대 결과 수')
    parser.add_argument('--output', type=str, help='출력 파일 경로 (선택사항)')

    args = parser.parse_args()

    try:
        emails = fetch_recent_emails(args.days, args.max_results)

        result = {
            'collected_at': datetime.now().isoformat(),
            'period_days': args.days,
            'total_count': len(emails),
            'unread_count': sum(1 for e in emails if e['is_unread']),
            'important_count': sum(1 for e in emails if e['is_important']),
            'emails': emails
        }

        # JSON 출력
        output_json = json.dumps(result, indent=2, ensure_ascii=False)

        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(output_json)
            print(f"✅ {len(emails)}개 이메일을 {args.output}에 저장했습니다.")
        else:
            print(output_json)

    except Exception as e:
        error_result = {
            'error': str(e),
            'collected_at': datetime.now().isoformat(),
            'total_count': 0
        }
        print(json.dumps(error_result, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
