"""
작업이 어느 리스트에 추가되었는지 확인
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

# ClickUp 설정
TEAM_ID = "90181381526"  # Eoeoeo 워크스페이스
USER_ID = "282830780"    # Seohyun Ahn
TASK_ID = "86ewjt5gf"    # 방금 추가한 작업


def check_task_location():
    """작업 위치 확인"""
    try:
        clickup = ClickUpClient()

        # 작업 상세 정보 조회
        task = clickup._make_request("GET", f"/task/{TASK_ID}")

        print("=" * 70)
        print("📍 작업 위치 확인")
        print("=" * 70)
        print()
        print(f"📋 작업: {task.get('name')}")
        print(f"🔗 URL: {task.get('url')}")
        print()
        print(f"📁 위치:")
        print(f"  - List: {task.get('list', {}).get('name')} (ID: {task.get('list', {}).get('id')})")

        folder = task.get('folder')
        if folder:
            print(f"  - Folder: {folder.get('name')} (ID: {folder.get('id')})")

        space = task.get('space')
        if space:
            print(f"  - Space: {space.get('name')} (ID: {space.get('id')})")

        print()
        print("=" * 70)
        print("🔍 Personal List 찾기")
        print("=" * 70)

        # 모든 스페이스와 리스트 조회
        spaces = clickup.get_spaces(TEAM_ID)

        for space in spaces:
            print(f"\n📁 Space: {space['name']}")
            lists = clickup.get_lists(space['id'])

            for lst in lists:
                marker = "👉" if 'personal' in lst['name'].lower() else "  "
                print(f"{marker} - {lst['name']} (ID: {lst['id']})")

        print()

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    check_task_location()
