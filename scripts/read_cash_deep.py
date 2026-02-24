"""2025 현금 시재 전체 + 2026년 종합 Income Statement + 2025년 종합"""
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

# 2025 현금 시재 전체 (고정비/변동비 포함)
print("=== 2025 현금 시재 전체 ===")
for row in read('2025 현금 시재', 'A1:Q60'):
    print(row)

# 2025년 종합 현황 Cash Flow + Income Statement
print("\n=== 2025년 종합 Row 18-80 ===")
for row in read('2025년', 'A18:V80'):
    print(row)

# 2026 Cash Position Summary - 은행별 상세 (나머지)
print("\n=== 2026 Cash Position Summary 전체 (row 20+) ===")
for row in read('2026 Cash Position Summary', 'A20:Z40'):
    print(row)
