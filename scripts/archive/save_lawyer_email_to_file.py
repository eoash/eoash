"""
Save lawyer email to UTF-8 text file
"""

import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ash_bot.integrations.gmail_client import GmailClient

def main():
    # Initialize Gmail client
    client = GmailClient()

    # Search for emails on 2026-02-10
    query = "after:2026/02/10 before:2026/02/11"
    messages = client.search_messages(query=query, max_results=100)

    # Find lawyer email
    lawyer_email = None
    for msg in messages:
        if '정호석' in msg['from'] or 'hoseok.jung@seumlaw.com' in msg['from'].lower():
            lawyer_email = msg
            break

    if not lawyer_email:
        print("[오류] 정호석 변호사 이메일을 찾지 못했습니다.")
        return

    # Create output directory
    output_dir = "email_output"
    os.makedirs(output_dir, exist_ok=True)

    # Save to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{output_dir}/lawyer_email_{timestamp}.txt"

    with open(filename, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("정호석 변호사 이메일 전체 내용\n")
        f.write("=" * 80 + "\n\n")
        f.write(f"발신: {lawyer_email['from']}\n")
        f.write(f"수신: {lawyer_email['to']}\n")
        f.write(f"제목: {lawyer_email['subject']}\n")
        f.write(f"날짜: {lawyer_email['date'].strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"라벨: {', '.join(lawyer_email['labels'])}\n\n")
        f.write("=" * 80 + "\n")
        f.write("이메일 본문:\n")
        f.write("=" * 80 + "\n\n")
        f.write(lawyer_email['body'])
        f.write(f"\n\n총 길이: {len(lawyer_email['body'])} 문자\n")

    print(f"[성공] 이메일을 파일로 저장했습니다:")
    print(f"       {os.path.abspath(filename)}")
    print(f"\nVSCode나 메모장으로 열어보세요!")

if __name__ == '__main__':
    main()
