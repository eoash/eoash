"""
Obsidian 자동 일기 생성 스크립트
매일 하루의 활동을 자동으로 기록합니다.
"""

import os
from datetime import datetime, timedelta
from pathlib import Path
import json
from typing import Optional, List, Dict
import re

# 설정
OBSIDIAN_VAULT = r"C:\Users\ash\Documents\안서현 두뇌"
JOURNAL_FOLDER = "일기장"
PROJECT_ROOT = Path(__file__).parent.parent
MEMORY_DIR = PROJECT_ROOT / "agent" / "memory"

# 요일 한글 매핑
WEEKDAY_KR = {
    0: "월", 1: "화", 2: "수", 3: "목",
    4: "금", 5: "토", 6: "일"
}


def get_today_journal_path(date: Optional[datetime] = None) -> Path:
    """오늘 날짜의 일기 파일 경로 생성"""
    if date is None:
        date = datetime.now()

    weekday = WEEKDAY_KR[date.weekday()]
    filename = f"{date.strftime('%Y-%m-%d')}({weekday}) 일기.md"
    return Path(OBSIDIAN_VAULT) / JOURNAL_FOLDER / filename


def load_claude_conversations(date: Optional[datetime] = None) -> List[str]:
    """Claude Code 대화 기록에서 오늘의 대화 추출"""
    if date is None:
        date = datetime.now()

    # 오늘 00:00부터 23:59까지의 타임스탬프 범위
    start_of_day = datetime(date.year, date.month, date.day, 0, 0, 0)
    end_of_day = datetime(date.year, date.month, date.day, 23, 59, 59)
    start_timestamp = int(start_of_day.timestamp() * 1000)
    end_timestamp = int(end_of_day.timestamp() * 1000)

    conversations = []
    history_file = Path.home() / ".claude" / "history.jsonl"

    if not history_file.exists():
        return conversations

    try:
        with open(history_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    timestamp = entry.get('timestamp', 0)

                    # 오늘의 대화만 필터링
                    if start_timestamp <= timestamp <= end_timestamp:
                        display = entry.get('display', '')
                        if display and not display.startswith('[Pasted text'):
                            # 너무 긴 텍스트는 요약
                            if len(display) > 200:
                                display = display[:200] + "..."
                            conversations.append(display)
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        print(f"Warning: Claude 대화 기록 로드 실패: {e}")

    return conversations


def summarize_conversations(conversations: List[str]) -> Dict[str, List[str]]:
    """대화 내용을 카테고리별로 분류 및 요약"""
    summary = {
        "tasks": [],
        "questions": [],
        "decisions": [],
        "topics": []
    }

    # 키워드 기반 분류
    task_keywords = ['해줘', '만들어', '추가해', '수정해', '설정해', '개선해', '구현']
    question_keywords = ['어떻게', '무엇', '왜', '?', '인가', '있어']
    decision_keywords = ['결정', '선택', '하자', '하겠', '할게']

    for conv in conversations:
        conv_lower = conv.lower()

        # 작업 요청
        if any(keyword in conv for keyword in task_keywords):
            summary['tasks'].append(conv)
        # 질문
        elif any(keyword in conv for keyword in question_keywords):
            summary['questions'].append(conv)
        # 결정
        elif any(keyword in conv for keyword in decision_keywords):
            summary['decisions'].append(conv)
        # 기타 주요 토픽
        else:
            if len(conv) > 10:  # 너무 짧은 건 제외
                summary['topics'].append(conv)

    return summary


def load_daily_activities() -> dict:
    """agent/memory에서 오늘의 활동 내용 로드"""
    activities = {
        "completed_tasks": [],
        "decisions": [],
        "financial_updates": [],
        "notes": [],
        "claude_conversations": []
    }

    # Claude 대화 기록 로드
    conversations = load_claude_conversations()
    if conversations:
        conv_summary = summarize_conversations(conversations)
        activities['claude_conversations'] = conv_summary
        activities['notes'].append(f"Claude와 {len(conversations)}개의 대화 진행")

    # last_run.json에서 오늘의 AR 자동화 결과 확인
    last_run_file = MEMORY_DIR / "last_run.json"
    if last_run_file.exists():
        try:
            with open(last_run_file, 'r', encoding='utf-8') as f:
                last_run = json.load(f)
                if last_run.get('date') == datetime.now().strftime('%Y-%m-%d'):
                    activities['completed_tasks'].append({
                        'title': 'AR 자동화 실행',
                        'details': f"매칭률: {last_run.get('match_rate', 'N/A')}%"
                    })
        except Exception as e:
            print(f"Warning: last_run.json 로드 실패: {e}")

    # financial_state.md에서 주요 변경사항 확인
    financial_state_file = MEMORY_DIR / "financial_state.md"
    if financial_state_file.exists():
        # 간단한 파싱 (나중에 개선 가능)
        try:
            with open(financial_state_file, 'r', encoding='utf-8') as f:
                content = f.read()
                # 최근 업데이트가 오늘인지 확인
                today_str = datetime.now().strftime('%Y-%m-%d')
                if today_str in content:
                    activities['financial_updates'].append("재무 상태 업데이트됨")
        except Exception as e:
            print(f"Warning: financial_state.md 확인 실패: {e}")

    return activities


def generate_journal_content(activities: dict) -> str:
    """일기 콘텐츠 생성 - 새로운 템플릿"""
    sections = []

    # 헤더
    today = datetime.now()
    sections.append(f"# 📅 {today.strftime('%Y-%m-%d')} 일기\n")
    sections.append(f"*생성: {today.strftime('%Y-%m-%d %H:%M')}*\n")

    conv_summary = activities.get('claude_conversations', {})

    # 메인 섹션: 오늘 한 일
    sections.append("## ✅ 오늘 한 일\n")

    tasks = conv_summary.get('tasks', [])
    topics = conv_summary.get('topics', [])
    decisions = conv_summary.get('decisions', [])

    # 작업과 토픽을 결합하여 "한 일" 생성
    work_items = []

    # 작업 요청에서 "한 일" 추출
    if tasks:
        for task in tasks[:10]:
            # "해줘", "만들어" 같은 요청을 "했다"로 변환
            work_item = task.replace('해줘', '함').replace('만들어', '만듦').replace('추가해', '추가함')
            work_item = work_item.replace('수정해', '수정함').replace('설정해', '설정함')
            work_items.append(f"- {work_item}")

    # 결정사항 추가
    if decisions:
        for decision in decisions[:5]:
            work_items.append(f"- {decision}")

    # 주요 토픽 추가 (작업이 적을 때)
    if len(work_items) < 3 and topics:
        for topic in topics[:3]:
            if len(topic) > 15:  # 의미있는 토픽만
                work_items.append(f"- {topic}")

    if work_items:
        sections.extend(work_items)
    else:
        sections.append("- _특별한 작업 없음_")

    sections.append("")
    sections.append("---\n")

    # 서브 섹션: 상세 대화 내용 (접을 수 있게)
    if conv_summary and any(conv_summary.values()):
        sections.append("<details>")
        sections.append("<summary><b>💬 상세 대화 내용 (클릭하여 펼치기)</b></summary>\n")

        # 작업 요청
        if tasks:
            sections.append("### 🔧 작업한 것")
            for task in tasks[:10]:
                sections.append(f"- {task}")
            sections.append("")

        # 질문
        questions = conv_summary.get('questions', [])
        if questions:
            sections.append("### ❓ 질문한 것")
            for q in questions[:5]:
                sections.append(f"- {q}")
            sections.append("")

        # 결정사항
        if decisions:
            sections.append("### ✅ 결정한 것")
            for d in decisions[:5]:
                sections.append(f"- {d}")
            sections.append("")

        # 주요 토픽
        if topics:
            sections.append("### 📌 논의한 주제")
            for topic in topics[:5]:
                sections.append(f"- {topic}")
            sections.append("")

        sections.append("</details>\n")

    # 완료된 작업 (AR 자동화 등)
    if activities['completed_tasks']:
        sections.append("## 🎯 시스템 작업\n")
        for task in activities['completed_tasks']:
            sections.append(f"- **{task['title']}**")
            if task.get('details'):
                sections.append(f"  - {task['details']}")
        sections.append("")

    # 재무 업데이트
    if activities['financial_updates']:
        sections.append("## 💰 재무 현황\n")
        for update in activities['financial_updates']:
            sections.append(f"- {update}")
        sections.append("")

    # 메모
    if activities['notes']:
        sections.append("## 📝 메모\n")
        for note in activities['notes']:
            sections.append(f"- {note}")
        sections.append("")

    # 활동이 없는 경우
    if not any([conv_summary, activities['completed_tasks'],
                activities['financial_updates'], activities['notes']]):
        sections.append("_오늘은 자동으로 기록된 활동이 없습니다._\n")

    return "\n".join(sections)


def create_or_append_journal(content: str, date: Optional[datetime] = None):
    """일기 파일 생성 또는 추가"""
    journal_path = get_today_journal_path(date)

    # 폴더가 없으면 생성
    journal_path.parent.mkdir(parents=True, exist_ok=True)

    if journal_path.exists():
        # 기존 일기가 있으면 하단에 추가
        with open(journal_path, 'r', encoding='utf-8') as f:
            existing_content = f.read()

        # 자동 생성 섹션이 이미 있으면 교체, 없으면 추가
        if "# 🤖 자동 생성 일기" in existing_content:
            # 기존 자동 생성 부분을 새 내용으로 교체
            parts = existing_content.split("# 🤖 자동 생성 일기")
            new_content = parts[0].rstrip() + "\n\n" + content
        else:
            # 하단에 추가
            new_content = existing_content.rstrip() + "\n\n---\n\n" + content

        with open(journal_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"✅ 기존 일기에 자동 내용 추가: {journal_path.name}")
    else:
        # 새 일기 파일 생성
        with open(journal_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"✅ 새 일기 파일 생성: {journal_path.name}")


def main():
    """메인 실행 함수"""
    # Windows 콘솔 인코딩 설정
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    print("🤖 Obsidian 자동 일기 생성 시작...")

    # 오늘의 활동 수집
    activities = load_daily_activities()

    # 일기 콘텐츠 생성
    content = generate_journal_content(activities)

    # 일기 파일에 저장
    create_or_append_journal(content)

    print("✅ 자동 일기 생성 완료!")


if __name__ == "__main__":
    main()
