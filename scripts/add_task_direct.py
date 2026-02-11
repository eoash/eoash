"""
직접 작업 추가 (Claude Code용)
"""
import sys
import io
from pathlib import Path
from datetime import datetime, timedelta

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from ash_bot.integrations.clickup_client import ClickUpClient
import os
from dotenv import load_dotenv

load_dotenv()

# ClickUp 설정
TEAM_ID = "90181381526"  # Eoeoeo 워크스페이스
USER_ID = "282830780"    # Seohyun Ahn
DEFAULT_LIST_ID = os.getenv('CLICKUP_DEFAULT_LIST_ID', '901811469193')  # Operation - 단발성 업무 프로젝트


def add_task(name: str, due_date=None, priority=None):
    """작업 추가"""
    try:
        clickup = ClickUpClient()

        # .env에서 설정한 기본 리스트 사용
        list_id = DEFAULT_LIST_ID

        # 작업 생성
        created_task = clickup.create_task(
            list_id=list_id,
            name=name,
            due_date=due_date,
            priority=priority,
            assignees=[USER_ID]
        )

        return created_task

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == '__main__':
    # 커맨드라인 인자로 작업 정보 받기
    if len(sys.argv) < 2:
        print("사용법: python add_task_direct.py <작업명> [마감일]")
        sys.exit(1)

    task_name = sys.argv[1]

    # 마감일 처리
    due = None
    if len(sys.argv) >= 3:
        if sys.argv[2] == "tomorrow":
            due = (datetime.now() + timedelta(days=1)).replace(hour=18, minute=0, second=0, microsecond=0)
        elif sys.argv[2] == "today":
            due = datetime.now().replace(hour=18, minute=0, second=0, microsecond=0)

    print(f"➕ 작업 추가 중: {task_name}")
    if due:
        print(f"   마감: {due.strftime('%Y-%m-%d %H:%M')}")

    result = add_task(task_name, due)

    if result:
        print(f"\n✅ 작업이 추가되었습니다!")
        print(f"🔗 {result.get('url', '')}")
