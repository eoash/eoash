"""
매일 아침 중요 이메일 요약 발송
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

from ash_bot.email_automation import EmailAutomation
import os
from dotenv import load_dotenv

load_dotenv()

SLACK_USER_ID = os.getenv('SLACK_USER_ID')


def send_daily_email_summary():
    """매일 아침 이메일 요약 발송"""
    print(f"📧 일일 이메일 요약 생성 - {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    try:
        automation = EmailAutomation()

        # 어제부터 지금까지 (24시간)
        summary = automation.summarize_important_emails(hours=24)

        # Slack 메시지 생성
        message_parts = [
            f"📧 *일일 이메일 요약* - {datetime.now().strftime('%Y-%m-%d')}",
            ""
        ]

        # VIP 이메일
        if summary['vip_emails']:
            message_parts.append("💎 *VIP 이메일*")
            for email in summary['vip_emails'][:5]:  # 최대 5개
                unread_mark = "🔴" if email['is_unread'] else ""
                sender = email['sender'].split('<')[0].strip().strip('"') if '<' in email['sender'] else email['sender']
                category = email.get('vip_category', 'vip').upper()

                message_parts.append(f"{unread_mark} [{category}] {sender}")
                message_parts.append(f"    📝 {email['subject']}")
                message_parts.append("")
        else:
            message_parts.append("💎 *VIP 이메일*: 없음")
            message_parts.append("")

        # 긴급 이메일
        if summary['urgent']:
            message_parts.append("🚨 *긴급 이메일*")
            for email in summary['urgent'][:3]:  # 최대 3개
                unread_mark = "🔴" if email['is_unread'] else ""
                sender = email['sender'].split('<')[0].strip().strip('"') if '<' in email['sender'] else email['sender']

                message_parts.append(f"{unread_mark} {sender}")
                message_parts.append(f"    📝 {email['subject']}")
                message_parts.append("")
        else:
            message_parts.append("🚨 *긴급 이메일*: 없음")
            message_parts.append("")

        # 액션 필요 이메일
        if summary['action_required']:
            message_parts.append("⚡ *액션 필요*")
            for email in summary['action_required'][:5]:  # 최대 5개
                unread_mark = "🔴" if email['is_unread'] else ""
                sender = email['sender'].split('<')[0].strip().strip('"') if '<' in email['sender'] else email['sender']

                message_parts.append(f"{unread_mark} {sender}")
                message_parts.append(f"    📝 {email['subject']}")
                message_parts.append("")

        # 요약 통계
        message_parts.append("---")
        message_parts.append(f"📊 *총계*: VIP {len(summary['vip_emails'])}개 | 긴급 {len(summary['urgent'])}개 | 액션 필요 {len(summary['action_required'])}개")

        message = "\n".join(message_parts)

        # Slack 전송
        if SLACK_USER_ID:
            automation.slack.send_dm(SLACK_USER_ID, message)
            print("✅ Slack DM 발송 완료")
        else:
            print("⚠️ SLACK_USER_ID가 설정되지 않았습니다")
            print("\n" + message)

        # 콘솔 출력
        print("\n=== 이메일 요약 ===")
        print(message)

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    send_daily_email_summary()
