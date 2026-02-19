"""
Gmail 발송 테스트 스크립트
"""
import os
import base64
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# 읽기 + 발송 스코프
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
]

PROJECT_ROOT = Path(__file__).parent.parent


def get_service():
    token_path = PROJECT_ROOT / 'token_send.json'
    creds_path = PROJECT_ROOT / 'credentials.json'

    creds = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), SCOPES)
            creds = flow.run_local_server(port=0)
        token_path.write_text(creds.to_json())
        print(f"✅ 인증 완료, 토큰 저장: {token_path}")

    return build('gmail', 'v1', credentials=creds)


def send_email(service, to, subject, body):
    msg = MIMEMultipart('alternative')
    msg['To'] = to
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain', 'utf-8'))

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    result = service.users().messages().send(
        userId='me',
        body={'raw': raw}
    ).execute()
    return result


if __name__ == '__main__':
    print("Gmail 발송 테스트 시작...")
    service = get_service()

    result = send_email(
        service,
        to='ash@eoeoeo.net',
        subject='[테스트] EO Studio Flip 메일 발송 테스트',
        body="""안녕하세요 안서현님,

이 메일은 Flip 관련 서류 요청 메일 발송 시스템 테스트입니다.

정상적으로 수신되셨다면 발송 기능이 작동하는 것입니다.

감사합니다.
EO Studio 안서현 드림"""
    )

    print(f"✅ 발송 완료! Message ID: {result['id']}")
