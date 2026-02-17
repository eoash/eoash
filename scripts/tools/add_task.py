"""
할 일 추가 스크립트
"""
import sys
import io
from pathlib import Path
from datetime import datetime, timedelta
import re

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from ash_bot.integrations.clickup_client import ClickUpClient

# ClickUp 설정
TEAM_ID = "90181381526"  # Eoeoeo 워크스페이스
USER_ID = "282830780"    # Seohyun Ahn


def parse_natural_language(text: str) -> dict:
    """
    자연어를 파싱해서 작업 정보 추출

    예시:
    - "투자자 미팅 준비, 금요일까지"
    - "이메일 답장, 내일 오후 3시"
    - "보고서 작성"
    """
    result = {
        'name': text,
        'due_date': None,
        'priority': None
    }

    # 마감일 키워드 패턴
    due_patterns = {
        '오늘': lambda: datetime.now().replace(hour=18, minute=0, second=0, microsecond=0),
        '내일': lambda: (datetime.now() + timedelta(days=1)).replace(hour=18, minute=0, second=0, microsecond=0),
        '모레': lambda: (datetime.now() + timedelta(days=2)).replace(hour=18, minute=0, second=0, microsecond=0),
        '이번 주': lambda: get_end_of_week(),
        '다음 주': lambda: get_end_of_week(next_week=True),
    }

    # 요일 패턴
    weekday_patterns = {
        '월요일': 0, '화요일': 1, '수요일': 2, '목요일': 3,
        '금요일': 4, '토요일': 5, '일요일': 6
    }

    # 우선순위 패턴
    priority_patterns = {
        '긴급': 1,
        '중요': 2,
        '보통': 3,
        '낮음': 4
    }

    # 쉼표로 분리
    parts = text.split(',')
    if len(parts) > 0:
        result['name'] = parts[0].strip()

    # 나머지 부분에서 마감일/우선순위 추출
    if len(parts) > 1:
        info_text = ','.join(parts[1:]).strip()

        # 마감일 패턴 체크
        for keyword, date_func in due_patterns.items():
            if keyword in info_text:
                result['due_date'] = date_func()
                break

        # 요일 체크
        for weekday, day_num in weekday_patterns.items():
            if weekday in info_text:
                result['due_date'] = get_next_weekday(day_num)
                break

        # 우선순위 체크
        for keyword, priority in priority_patterns.items():
            if keyword in info_text:
                result['priority'] = priority
                break

    return result


def get_end_of_week(next_week=False):
    """이번 주 또는 다음 주 금요일 반환"""
    today = datetime.now()
    days_until_friday = (4 - today.weekday()) % 7

    if next_week or days_until_friday == 0:
        days_until_friday += 7

    friday = today + timedelta(days=days_until_friday)
    return friday.replace(hour=18, minute=0, second=0, microsecond=0)


def get_next_weekday(target_day: int):
    """다가오는 특정 요일 반환 (0=월요일, 6=일요일)"""
    today = datetime.now()
    current_day = today.weekday()

    days_ahead = target_day - current_day
    if days_ahead <= 0:  # 이미 지났거나 오늘이면 다음 주
        days_ahead += 7

    target_date = today + timedelta(days=days_ahead)
    return target_date.replace(hour=18, minute=0, second=0, microsecond=0)


def add_task_interactive():
    """대화식으로 작업 추가"""
    print("=" * 70)
    print("➕ 할 일 추가")
    print("=" * 70)
    print()
    print("사용법:")
    print("  - 간단: 작업 제목만 입력")
    print("  - 마감일: 작업 제목, 금요일까지")
    print("  - 우선순위: 작업 제목, 내일까지, 긴급")
    print()

    # 작업 입력 받기
    task_input = input("➕ 할 일을 입력하세요: ").strip()

    if not task_input:
        print("❌ 작업을 입력해주세요.")
        return

    try:
        # ClickUp 클라이언트
        clickup = ClickUpClient()

        # 기본 리스트 찾기
        list_id = clickup.get_default_list(TEAM_ID, USER_ID)

        if not list_id:
            print("❌ 작업을 추가할 리스트를 찾을 수 없습니다.")
            return

        # 자연어 파싱
        task_info = parse_natural_language(task_input)

        print(f"\n📝 작업 정보:")
        print(f"  - 제목: {task_info['name']}")
        if task_info['due_date']:
            print(f"  - 마감: {task_info['due_date'].strftime('%Y-%m-%d (%A) %H:%M')}")
        if task_info['priority']:
            priority_names = {1: '긴급', 2: '높음', 3: '보통', 4: '낮음'}
            print(f"  - 우선순위: {priority_names.get(task_info['priority'], '미설정')}")

        # 확인
        confirm = input("\n✅ 이대로 추가할까요? (y/n): ").strip().lower()

        if confirm != 'y':
            print("❌ 취소했습니다.")
            return

        # 작업 생성
        created_task = clickup.create_task(
            list_id=list_id,
            name=task_info['name'],
            due_date=task_info['due_date'],
            priority=task_info['priority'],
            assignees=[USER_ID]
        )

        print()
        print("=" * 70)
        print("✅ 할 일이 추가되었습니다!")
        print("=" * 70)
        print(f"\n📋 {task_info['name']}")
        print(f"🔗 {created_task.get('url', '')}")
        print()

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    add_task_interactive()
