"""
Google Calendar 일정 수집 스크립트

기능: 오늘부터 N일간의 캘린더 일정을 수집하여 JSON으로 출력
환경: token.json 파일 사용 (Google OAuth)
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
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

def get_calendar_service():
    """Calendar API 서비스 객체 생성"""
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

    return build('calendar', 'v3', credentials=creds)

def fetch_upcoming_events(days=7, max_results=50):
    """
    향후 N일간의 캘린더 일정 수집

    Args:
        days: 조회 기간 (일)
        max_results: 최대 결과 수

    Returns:
        list: 일정 정보 리스트
    """
    if not GOOGLE_AVAILABLE:
        return []

    service = get_calendar_service()

    # 시간 범위 설정
    now = datetime.now()
    time_min = now.isoformat() + 'Z'
    time_max = (now + timedelta(days=days)).isoformat() + 'Z'

    # 이벤트 조회
    events_result = service.events().list(
        calendarId='primary',
        timeMin=time_min,
        timeMax=time_max,
        maxResults=max_results,
        singleEvents=True,
        orderBy='startTime'
    ).execute()

    events = events_result.get('items', [])

    # 이벤트 정보 파싱
    parsed_events = []
    for event in events:
        start = event['start'].get('dateTime', event['start'].get('date'))
        end = event['end'].get('dateTime', event['end'].get('date'))

        event_info = {
            'id': event['id'],
            'summary': event.get('summary', '(제목 없음)'),
            'description': event.get('description', ''),
            'location': event.get('location', ''),
            'start': start,
            'end': end,
            'attendees': [
                {
                    'email': a.get('email', ''),
                    'response': a.get('responseStatus', 'needsAction')
                }
                for a in event.get('attendees', [])
            ],
            'organizer': event.get('organizer', {}).get('email', ''),
            'status': event.get('status', ''),
            'html_link': event.get('htmlLink', '')
        }

        parsed_events.append(event_info)

    return parsed_events

def main():
    parser = argparse.ArgumentParser(description='Google Calendar 일정 수집')
    parser.add_argument('--days', type=int, default=7, help='조회 기간 (일)')
    parser.add_argument('--max-results', type=int, default=50, help='최대 결과 수')
    parser.add_argument('--output', type=str, help='출력 파일 경로 (선택사항)')

    args = parser.parse_args()

    try:
        events = fetch_upcoming_events(args.days, args.max_results)

        # 오늘/이번주 일정 구분
        today = datetime.now().date()
        today_events = [e for e in events if e['start'].startswith(today.isoformat())]

        result = {
            'collected_at': datetime.now().isoformat(),
            'period_days': args.days,
            'total_count': len(events),
            'today_count': len(today_events),
            'events': events
        }

        # JSON 출력
        output_json = json.dumps(result, indent=2, ensure_ascii=False)

        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(output_json)
            print(f"✅ {len(events)}개 일정을 {args.output}에 저장했습니다.")
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
