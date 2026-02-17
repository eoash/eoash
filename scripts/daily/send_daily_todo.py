"""
매일 아침 ClickUp 투두리스트를 Slack DM으로 전송
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
from ash_bot.integrations.slack_client import SlackClient
import os
from dotenv import load_dotenv

load_dotenv()

# ClickUp 설정
TEAM_ID = "90181381526"  # Eoeoeo 워크스페이스
USER_ID = "282830780"    # Seohyun Ahn

# Slack 설정
SLACK_USER_ID = os.getenv('SLACK_USER_ID')  # .env에서 로드


def send_daily_todo():
    """매일 투두리스트 전송"""
    print(f"🤖 {datetime.now().strftime('%Y-%m-%d %H:%M')} - 투두리스트 전송 시작...")

    try:
        # ClickUp 클라이언트 초기화
        clickup = ClickUpClient()
        print("✅ ClickUp 연결 성공")

        # 오늘 할 일 조회
        today_tasks = clickup.get_today_tasks(team_id=TEAM_ID, user_id=USER_ID)
        print(f"📋 오늘 마감 작업: {len(today_tasks)}개")

        # 다가오는 작업도 함께 조회 (7일)
        upcoming_tasks = clickup.get_upcoming_tasks(
            team_id=TEAM_ID,
            user_id=USER_ID,
            days=7
        )
        print(f"📆 다가오는 작업 (7일): {len(upcoming_tasks)}개")

        # Slack 클라이언트 초기화
        slack = SlackClient()
        print("✅ Slack 연결 성공")

        if not SLACK_USER_ID:
            print("❌ SLACK_USER_ID가 .env 파일에 설정되지 않았습니다")
            return False

        # 오늘 할 일이 있으면 전송
        if today_tasks:
            success = slack.send_todo_list_dm(SLACK_USER_ID, today_tasks)
            if success:
                print(f"✅ 오늘 할 일 DM 전송 완료 ({len(today_tasks)}개)")
            else:
                print("❌ DM 전송 실패")
                return False
        else:
            # 오늘 할 일이 없어도 메시지 전송
            success = slack.send_dm(
                SLACK_USER_ID,
                "📋 *오늘 할 일*\n\n오늘 마감 작업이 없습니다! 🎉"
            )
            if success:
                print("✅ '할 일 없음' 메시지 전송 완료")

        # 다가오는 작업도 함께 전송 (옵션)
        if upcoming_tasks and len(upcoming_tasks) > 0:
            upcoming_msg = format_upcoming_tasks(upcoming_tasks[:5])
            slack.send_dm(SLACK_USER_ID, upcoming_msg)
            print(f"✅ 다가오는 작업 정보 전송 완료")

        print("🎉 투두리스트 전송 완료!")
        return True

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return False


def format_upcoming_tasks(tasks: list) -> str:
    """다가오는 작업 포맷팅"""
    from datetime import datetime

    if not tasks:
        return ""

    lines = ["\n📆 *다가오는 작업 (7일)*\n"]

    for task in tasks:
        name = task.get('name', 'Untitled')
        due_date = task.get('due_date')
        url = task.get('url', '')
        priority = task.get('priority')

        # 우선순위
        priority_map = {1: '🔴', 2: '🟠', 3: '🟡', 4: '🟢'}
        priority_emoji = priority_map.get(priority, '⚪')

        # 마감일
        if due_date:
            due_dt = datetime.fromtimestamp(int(due_date) / 1000)
            due_str = due_dt.strftime('%m/%d %H:%M')
        else:
            due_str = '미정'

        # 링크
        task_link = f"<{url}|{name}>" if url else name

        lines.append(f"  {priority_emoji} {task_link} - {due_str}")

    return "\n".join(lines)


if __name__ == '__main__':
    send_daily_todo()
