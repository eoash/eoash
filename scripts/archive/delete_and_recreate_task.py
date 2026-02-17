"""
작업 삭제하고 다시 생성
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

TASK_ID = "86ewjt5gf"  # 삭제할 작업
LIST_ID = "901811469193"  # Operation - 단발성 업무 프로젝트
USER_ID = "282830780"


def delete_and_recreate():
    """작업 삭제하고 재생성"""
    try:
        clickup = ClickUpClient()

        print("🗑️  기존 작업 삭제 중...")

        # 작업 삭제
        clickup._make_request("DELETE", f"/task/{TASK_ID}")
        print("✅ 기존 작업 삭제 완료")

        print("\n➕ 새 작업 생성 중...")

        # 새 작업 생성
        due_date = (datetime.now() + timedelta(days=1)).replace(hour=18, minute=0, second=0, microsecond=0)

        new_task = clickup.create_task(
            list_id=LIST_ID,
            name="Claude Code 사례 Slack 공유",
            due_date=due_date,
            assignees=[USER_ID]
        )

        print("✅ 새 작업 생성 완료!")
        print(f"\n📋 {new_task.get('name')}")
        print(f"📁 위치: {new_task.get('list', {}).get('name')}")
        print(f"📅 마감: 내일 (02/12) 18:00")
        print(f"🔗 {new_task.get('url')}")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    delete_and_recreate()
