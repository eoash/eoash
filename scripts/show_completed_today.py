"""
오늘 완료한 작업 조회
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


def show_completed_today():
    """오늘 완료한 작업 조회"""
    print("=" * 70)
    print(f"✅ 오늘 완료한 작업 - {datetime.now().strftime('%Y-%m-%d (%A)')}")
    print("=" * 70)

    try:
        clickup = ClickUpClient()

        # 오늘 00:00 ~ 23:59 (완료된 작업 포함)
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)

        due_date_gt = int(today_start.timestamp() * 1000)
        due_date_lt = int(today_end.timestamp() * 1000)

        # 완료된 작업 포함해서 조회
        all_tasks = clickup.get_team_tasks(
            team_id=TEAM_ID,
            assignees=[USER_ID],
            due_date_gt=due_date_gt,
            due_date_lt=due_date_lt,
            include_closed=True  # 완료된 작업 포함
        )

        # 완료된 작업만 필터링
        completed_tasks = [
            task for task in all_tasks
            if task.get('status', {}).get('status', '').lower() in ['complete', 'completed', 'closed']
        ]

        print(f"\n총 {len(completed_tasks)}개 작업 완료\n")

        if completed_tasks:
            for i, task in enumerate(completed_tasks, 1):
                name = task.get('name', '제목 없음')
                url = task.get('url', '')

                # 완료 시간
                date_closed = task.get('date_closed')
                if date_closed:
                    closed_dt = datetime.fromtimestamp(int(date_closed) / 1000)
                    closed_str = closed_dt.strftime('%H:%M')
                else:
                    closed_str = "시간 미상"

                # 태그/리스트
                list_name = task.get('list', {}).get('name', '')
                folder_name = task.get('folder', {}).get('name', '')

                print(f"{i}. ✅ {name}")
                print(f"   └─ 완료: {closed_str}")
                if folder_name:
                    print(f"   └─ 위치: {folder_name} / {list_name}")
                elif list_name:
                    print(f"   └─ 위치: {list_name}")
                print(f"   └─ {url}")
                print()
        else:
            print("   오늘 완료한 작업이 없습니다.\n")

        # 추가: 오늘 업데이트된 모든 작업 (마감일 상관없이)
        print("\n" + "=" * 70)
        print("📝 오늘 업데이트된 작업 (마감일 무관)")
        print("=" * 70)

        # date_updated로 조회
        all_updated = clickup.get_team_tasks(
            team_id=TEAM_ID,
            assignees=[USER_ID],
            include_closed=True
        )

        # 오늘 업데이트된 작업 필터링
        today_updated = []
        for task in all_updated:
            date_updated = task.get('date_updated')
            if date_updated:
                updated_dt = datetime.fromtimestamp(int(date_updated) / 1000)
                if updated_dt.date() == datetime.now().date():
                    today_updated.append(task)

        # 완료된 작업만
        completed_updated = [
            task for task in today_updated
            if task.get('status', {}).get('status', '').lower() in ['complete', 'completed', 'closed']
        ]

        print(f"\n총 {len(completed_updated)}개 작업 완료 (마감일 무관)\n")

        if completed_updated:
            for i, task in enumerate(completed_updated, 1):
                name = task.get('name', '제목 없음')
                url = task.get('url', '')

                date_closed = task.get('date_closed')
                if date_closed:
                    closed_dt = datetime.fromtimestamp(int(date_closed) / 1000)
                    closed_str = closed_dt.strftime('%H:%M')
                else:
                    closed_str = "시간 미상"

                list_name = task.get('list', {}).get('name', '')

                print(f"{i}. ✅ {name}")
                print(f"   └─ 완료: {closed_str}")
                if list_name:
                    print(f"   └─ {list_name}")
                print(f"   └─ {url}")
                print()

        print("=" * 70)

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    show_completed_today()
