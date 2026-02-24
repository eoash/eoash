"""
핵심 시트 상세 데이터 읽기
"""
import os
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
]
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN_FILE = os.path.join(BASE_DIR, 'token_sheets.json')
SPREADSHEET_ID = '1Vw4_IszfjrxGa1z51LZ2WmvJ71I5eWPghR-uSr3f0pM'


def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return build('sheets', 'v4', credentials=creds)


def read(service, sheet, range_str):
    r = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"'{sheet}'!{range_str}"
    ).execute()
    return r.get('values', [])


def show(title, rows):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)
    for row in rows:
        print(row)


service = get_service()

# 1. 2026 매출 전체 구조
show("2026 매출 A1:T30", read(service, '2026 매출', 'A1:T30'))

# 2. 2026 Cash Position Summary
show("2026 Cash Position Summary A1:H20", read(service, '2026 Cash Position Summary', 'A1:H20'))

# 3. 거래처별 미수금 현황표
show("거래처별 미수금 A1:N30", read(service, '거래처별 미수금/회수기간 관리표', 'A1:N30'))

# 4. 매출비교 (연도별)
show("매출비교 A1:R20", read(service, '매출비교', 'A1:R20'))

# 5. 2026년 종합 현황
show("2026년 A1:V10", read(service, '2026년', 'A1:V10'))
