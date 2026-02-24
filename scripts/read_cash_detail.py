"""Cash Position, 현금 시재, 매출 시트에서 캐시플로우 관련 데이터 상세 조회"""
import os
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN_FILE = os.path.join(BASE_DIR, 'token_sheets.json')
SPREADSHEET_ID = '1Vw4_IszfjrxGa1z51LZ2WmvJ71I5eWPghR-uSr3f0pM'
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly']

creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
if creds.expired and creds.refresh_token:
    creds.refresh(Request())
service = build('sheets', 'v4', credentials=creds)

def read(sheet, rng):
    r = service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID, range=f"'{sheet}'!{rng}").execute()
    return r.get('values', [])

# 1. Cash Position Summary 전체
print("=== 2026 Cash Position Summary 전체 ===")
for row in read('2026 Cash Position Summary', 'A1:Z30'):
    print(row)

# 2. 2025 현금 시재
print("\n=== 2025 현금 시재 A1:Q20 ===")
for row in read('2025 현금 시재', 'A1:Q20'):
    print(row)

# 3. 2026년 종합 현황 (더 많은 행)
print("\n=== 2026년 종합 A1:V50 ===")
for row in read('2026년', 'A1:V50'):
    print(row)
