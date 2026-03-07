"""
Gmail 발송 테스트 스크립트
"""
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import google.auth
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
]


def get_service():
    creds, _ = google.auth.default(scopes=SCOPES)
    creds.refresh(Request())
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
