"""
Google Sheets 데이터 읽기 스크립트
"""
import sys
import google.auth
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
]

SPREADSHEET_ID = '1Vw4_IszfjrxGa1z51LZ2WmvJ71I5eWPghR-uSr3f0pM'


def get_credentials():
    creds, _ = google.auth.default(scopes=SCOPES)
    creds.refresh(Request())
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
