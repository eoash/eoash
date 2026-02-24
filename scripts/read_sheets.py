"""
Google Sheets 데이터 읽기 스크립트
"""
import os
import sys
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
]

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREDENTIALS_FILE = os.path.join(BASE_DIR, 'credentials.json')
TOKEN_FILE = os.path.join(BASE_DIR, 'token_sheets.json')

SPREADSHEET_ID = '1Vw4_IszfjrxGa1z51LZ2WmvJ71I5eWPghR-uSr3f0pM'


def get_credentials():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'w', encoding='utf-8') as token:
            token.write(creds.to_json())
        print(f"토큰 저장 완료: {TOKEN_FILE}", file=sys.stderr)
    return creds


def main():
    creds = get_credentials()
    service = build('sheets', 'v4', credentials=creds)

    spreadsheet = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    sheets = spreadsheet.get('sheets', [])
    print(f"스프레드시트: {spreadsheet['properties']['title']}")
    print(f"총 {len(sheets)}개 시트:\n")
    for i, sheet in enumerate(sheets):
        props = sheet['properties']
        print(f"  [{i}] {props['title']} (gid={props['sheetId']})")

    # 2026 매출 핵심 데이터 미리보기
    print("\n\n=== 2026 매출 상위 10행 ===")
    r = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID,
        range="'2026 매출'!A1:T10"
    ).execute()
    for row in r.get('values', []):
        print(row)


if __name__ == '__main__':
    main()
