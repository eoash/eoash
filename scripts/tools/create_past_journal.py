"""
과거 날짜의 자동일기 생성
"""
import sys
from datetime import datetime
from pathlib import Path

# daily_journal 모듈 import
sys.path.insert(0, str(Path(__file__).parent))
from daily_journal import load_daily_activities, generate_journal_content, create_or_append_journal, load_claude_conversations, summarize_conversations

def create_journal_for_date(date_str):
    """특정 날짜의 일기 생성"""
    # 날짜 파싱
    target_date = datetime.strptime(date_str, '%Y-%m-%d')

    print(f"🤖 {date_str} 자동 일기 생성 시작...")

    # 해당 날짜의 Claude 대화 로드
    conversations = load_claude_conversations(target_date)

    activities = {
        "completed_tasks": [],
        "decisions": [],
        "financial_updates": [],
        "notes": [],
        "claude_conversations": {}
    }

    # Claude 대화 요약
    if conversations:
        conv_summary = summarize_conversations(conversations)
        activities['claude_conversations'] = conv_summary
        activities['notes'].append(f"Claude와 {len(conversations)}개의 대화 진행")

    # 일기 콘텐츠 생성 (새 템플릿 사용)
    sections = []

    # 헤더
    sections.append(f"# 📅 {target_date.strftime('%Y-%m-%d')} 일기\n")
    sections.append(f"*생성: {datetime.now().strftime('%Y-%m-%d %H:%M')}*\n")

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

    # 메모
    if activities['notes']:
        sections.append("## 📝 메모\n")
        for note in activities['notes']:
            sections.append(f"- {note}")
        sections.append("")

    # 활동이 없는 경우
    if not any([conv_summary, activities['completed_tasks'],
                activities['financial_updates'], activities['notes']]):
        sections.append("_해당 날짜에 자동으로 기록된 활동이 없습니다._\n")

    content = "\n".join(sections)

    # 일기 파일에 저장
    create_or_append_journal(content, target_date)

    print(f"✅ {date_str} 자동 일기 생성 완료!")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        date_str = sys.argv[1]
    else:
        date_str = "2026-02-10"

    # Windows 콘솔 인코딩 설정
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    create_journal_for_date(date_str)
