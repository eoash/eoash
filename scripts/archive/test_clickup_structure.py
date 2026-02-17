"""
ClickUp 구조 확인 및 사용자 ID 파악
"""
import sys
import io
from pathlib import Path

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from ash_bot.integrations.clickup_client import ClickUpClient

def main():
    client = ClickUpClient()

    # 사용자 정보
    print("=" * 60)
    print("📋 ClickUp 구조 분석")
    print("=" * 60)

    user_info = client.get_authorized_user()
    user_id = user_info['user']['id']
    username = user_info['user']['username']

    print(f"\n👤 사용자 정보:")
    print(f"  - 이름: {username}")
    print(f"  - User ID: {user_id}")

    # 워크스페이스
    teams = client.get_teams()
    print(f"\n📁 워크스페이스: {len(teams)}개")

    for team in teams:
        team_id = team['id']
        team_name = team['name']
        print(f"\n  워크스페이스: {team_name} (ID: {team_id})")

        # 스페이스 조회
        spaces = client.get_spaces(team_id)
        print(f"    └─ 스페이스: {len(spaces)}개")

        for space in spaces[:5]:  # 최대 5개만
            space_name = space['name']
            space_id = space['id']
            print(f"       └─ {space_name} (ID: {space_id})")

        # 오늘 할 일 조회
        print(f"\n  📅 오늘 마감 작업 조회...")
        today_tasks = client.get_today_tasks(team_id=team_id, user_id=user_id)

        if today_tasks:
            print(f"    오늘 마감 작업: {len(today_tasks)}개")
            for task in today_tasks[:5]:
                print(f"      - {client.format_task_summary(task)}")
        else:
            print("    오늘 마감 작업 없음")

        # 다가오는 작업 (7일)
        print(f"\n  📆 다가오는 작업 조회 (7일)...")
        upcoming_tasks = client.get_upcoming_tasks(team_id=team_id, user_id=user_id, days=7)

        if upcoming_tasks:
            print(f"    다가오는 작업: {len(upcoming_tasks)}개")
            for task in upcoming_tasks[:10]:
                print(f"      - {client.format_task_summary(task)}")
        else:
            print("    다가오는 작업 없음")

    print("\n" + "=" * 60)
    print("✅ 구조 분석 완료!")
    print("=" * 60)

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
