"""Message Builder 테스트."""
from src.message_builder import MessageBuilder


def test_welcome_message():
    blocks = MessageBuilder.welcome("환영합니다!")
    assert len(blocks) >= 2
    actions = [b for b in blocks if b.get("type") == "actions"]
    assert len(actions) == 1


def test_checklist_mission():
    mission = {
        "id": "join_channels",
        "title": "채널 가입",
        "description": "채널에 가입하세요",
        "type": "checklist",
        "items": ["#general", "#random"],
    }
    blocks = MessageBuilder.mission(mission, checked=[])
    actions = [b for b in blocks if b.get("type") == "actions"]
    assert len(actions) == 1
    buttons = actions[0]["elements"]
    assert len(buttons) == 2


def test_quiz_mission():
    mission = {
        "id": "quiz1",
        "title": "퀴즈",
        "description": "맞춰보세요",
        "type": "quiz",
        "question": "1+1은?",
        "options": ["1", "2", "3"],
    }
    blocks = MessageBuilder.mission(mission)
    actions = [b for b in blocks if b.get("type") == "actions"]
    assert len(actions) == 1
    buttons = actions[0]["elements"]
    assert len(buttons) == 3


def test_confirm_mission():
    mission = {
        "id": "confirm1",
        "title": "확인",
        "description": "읽었으면 확인",
        "type": "confirm",
    }
    blocks = MessageBuilder.mission(mission)
    actions = [b for b in blocks if b.get("type") == "actions"]
    buttons = actions[0]["elements"]
    assert len(buttons) == 1
    assert buttons[0]["text"]["text"] == "완료 ✅"


def test_progress_bar():
    blocks = MessageBuilder.progress_update(3, 8, "회사 문화/정책 파악")
    text_blocks = [b for b in blocks if b.get("type") == "section"]
    assert len(text_blocks) >= 1


def test_hr_status():
    users = [
        {"user_name": "김철수", "completed_at": "2026-02-25", "completed": 8, "total": 8},
        {"user_name": "이영희", "completed_at": None, "completed": 3, "total": 8},
    ]
    blocks = MessageBuilder.hr_status(users)
    assert len(blocks) >= 2
