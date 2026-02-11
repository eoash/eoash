"""
투두리스트 조회 및 출력 (Slack 없이)
"""
import sys
import io
from pathlib import Path
from datetime import datetime

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from ash_bot.integrations.clickup_client import ClickUpClient

# ClickUp 설정
TEAM_ID = "90181381526"  # Eoeoeo 워크스페이스
USER_ID = "282830780"    # Seohyun Ahn


def show_todo():
    """투두리스트 조회 및 출력"""
    print("=" * 70)
    print(f"📋 오늘의 투두리스트 - {datetime.now().strftime('%Y-%m-%d (%A)')}")
    print("=" * 70)

    try:
        # ClickUp 클라이언트 초기화
        clickup = ClickUpClient()

        # 오늘 마감 작업
        print("\n🔴 오늘 마감 (Today)")
        print("-" * 70)
        today_tasks = clickup.get_today_tasks(team_id=TEAM_ID, user_id=USER_ID)

        if today_tasks:
            for i, task in enumerate(today_tasks, 1):
                status_emoji = "✅" if task.get('status', {}).get('status') == 'complete' else "⚪"
                name = task.get('name', '제목 없음')
                url = task.get('url', '')
                due_date = task.get('due_date')

                if due_date:
                    due_dt = datetime.fromtimestamp(int(due_date) / 1000)
                    due_str = due_dt.strftime('%H:%M')
                else:
                    due_str = "시간 미정"

                print(f"{i}. {status_emoji} {name}")
                print(f"   └─ 마감: {due_str}")
                print(f"   └─ {url}")
                print()
        else:
            print("   오늘 마감 작업이 없습니다! 🎉\n")

        # 다가오는 작업 (7일)
        print("📆 다가오는 작업 (이번 주)")
        print("-" * 70)
        upcoming_tasks = clickup.get_upcoming_tasks(
            team_id=TEAM_ID,
            user_id=USER_ID,
            days=7
        )

        if upcoming_tasks:
            for i, task in enumerate(upcoming_tasks, 1):
                status_emoji = "✅" if task.get('status', {}).get('status') == 'complete' else "⚪"
                name = task.get('name', '제목 없음')
                url = task.get('url', '')
                due_date = task.get('due_date')

                if due_date:
                    due_dt = datetime.fromtimestamp(int(due_date) / 1000)
                    due_str = due_dt.strftime('%m/%d (%a) %H:%M')
                else:
                    due_str = "날짜 미정"

                print(f"{i}. {status_emoji} {name}")
                print(f"   └─ 마감: {due_str}")
                print(f"   └─ {url}")
                print()
        else:
            print("   이번 주 예정된 작업이 없습니다!\n")

        # 진행 중인 작업 (마감일 상관없이)
        print("🔄 진행 중인 작업")
        print("-" * 70)
        in_progress_tasks = clickup.get_tasks_by_status(
            team_id=TEAM_ID,
            user_id=USER_ID,
            statuses=["in progress", "in review"]
        )

        if in_progress_tasks:
            for i, task in enumerate(in_progress_tasks[:10], 1):  # 최대 10개
                name = task.get('name', '제목 없음')
                status = task.get('status', {}).get('status', 'unknown')
                url = task.get('url', '')

                print(f"{i}. 🔄 {name} [{status}]")
                print(f"   └─ {url}")
                print()
        else:
            print("   진행 중인 작업이 없습니다.\n")

        print("=" * 70)
        print(f"✅ 총 {len(today_tasks)}개 오늘 마감, {len(upcoming_tasks)}개 이번 주, {len(in_progress_tasks)}개 진행 중")
        print("=" * 70)

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    show_todo()
