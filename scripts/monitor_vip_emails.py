"""
VIP 발신자 이메일 모니터링
새 VIP 이메일이 오면 Slack으로 즉시 알림
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


def monitor_vip_emails():
    """VIP 이메일 모니터링"""
    print(f"🔍 VIP 이메일 모니터링 시작 - {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    try:
        automation = EmailAutomation()

        # 최근 1시간 VIP 이메일 확인
        vip_emails = automation.check_vip_emails(hours=1)

        if not vip_emails:
            print("✅ 새로운 VIP 이메일 없음")
            return

        print(f"📧 새 VIP 이메일 {len(vip_emails)}개 발견!")

        # Slack 알림
        if SLACK_USER_ID:
            for email in vip_emails:
                if email['is_unread']:  # 읽지 않은 이메일만
                    category_emoji = {
                        'investor': '💰',
                        'lawyer': '⚖️',
                        'partner': '🤝'
                    }.get(email['category'], '📧')

                    message = f"""
{category_emoji} *VIP 이메일 도착!*

*카테고리*: {email['category'].upper()}
*발신자*: {email['sender']}
*제목*: {email['subject']}
*시간*: {email['date']}

_즉시 확인이 필요할 수 있습니다._
"""

                    automation.slack.send_dm(SLACK_USER_ID, message.strip())
                    print(f"  ✅ Slack 알림 발송: {email['subject']}")

        else:
            print("⚠️ SLACK_USER_ID가 설정되지 않아 Slack 알림을 보낼 수 없습니다")
            for email in vip_emails:
                print(f"  - [{email['category']}] {email['sender']}: {email['subject']}")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    monitor_vip_emails()
