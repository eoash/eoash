"""
작업을 다른 리스트로 이동
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

TASK_ID = "86ewjt5gf"  # 방금 추가한 작업
NEW_LIST_ID = "901811469193"  # Operation - 단발성 업무 프로젝트


def move_task():
    """작업 이동"""
    try:
        clickup = ClickUpClient()

        print("📦 작업 이동 중...")

        # 작업 이동 (PUT으로 list 업데이트)
        result = clickup._make_request(
            "PUT",
            f"/task/{TASK_ID}",
            json={"list": NEW_LIST_ID}
        )

        print(f"✅ 작업이 이동되었습니다!")
        print(f"📋 {result.get('name')}")
        print(f"📁 새 위치: {result.get('list', {}).get('name')}")
        print(f"🔗 {result.get('url')}")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    move_task()
