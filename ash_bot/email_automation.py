"""
이메일 자동화 - 액션 아이템 추출 및 모니터링
"""
import json
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from ash_bot.integrations.gmail_client import GmailClient
from ash_bot.integrations.clickup_client import ClickUpClient
from ash_bot.integrations.slack_client import SlackClient
from ash_bot.core.vip_classifier import VipClassifier
from ash_bot.core.action_extractor import ActionExtractor

logger = logging.getLogger(__name__)

CONFIG_DIR = Path(__file__).parent.parent / "config"
VIP_CONFIG = CONFIG_DIR / "vip_emails.json"


class EmailAutomation:
    """이메일 자동화 — VIP 모니터링 및 ClickUp 작업 생성."""

    def __init__(
        self,
        gmail: GmailClient,
        clickup: ClickUpClient,
        slack: SlackClient,
        vip_classifier: VipClassifier,
        action_extractor: ActionExtractor,
        clickup_list_id: str,
        clickup_user_id: str,
    ):
        self.gmail = gmail
        self.clickup = clickup
        self.slack = slack
        self.vip_classifier = vip_classifier
        self.action_extractor = action_extractor
        self._list_id = clickup_list_id
        self._user_id = clickup_user_id

    @classmethod
    def create_default(cls) -> "EmailAutomation":
        """환경변수 + 설정 파일 기반 기본 인스턴스 생성 (프로덕션용)."""
        from ash_bot.config import ClickUpConfig

        vip_config: Dict = {}
        if VIP_CONFIG.exists():
            try:
                with open(VIP_CONFIG, "r", encoding="utf-8") as f:
                    vip_config = json.load(f)
            except (json.JSONDecodeError, OSError) as e:
                logger.warning(f"VIP 설정 로드 실패: {e}")

        return cls(
            gmail=GmailClient(),
            clickup=ClickUpClient(),
            slack=SlackClient(),
            vip_classifier=VipClassifier(vip_config),
            action_extractor=ActionExtractor.from_vip_config(vip_config),
            clickup_list_id=ClickUpConfig.DEFAULT_LIST_ID or "",
            clickup_user_id=ClickUpConfig.USER_ID or "",
        )

    def is_vip_sender(self, sender_email: str) -> Tuple[bool, str]:
        """VIP 발신자인지 확인. (하위 호환성 유지용 래퍼)"""
        return self.vip_classifier.classify(sender_email)

    def extract_action_items(self, subject: str, body: str) -> List[str]:
        """이메일에서 액션 아이템 추출. (하위 호환성 유지용 래퍼)"""
        return self.action_extractor.extract(subject, body)

    def check_vip_emails(self, hours: int = 24) -> List[Dict]:
        """
        최근 VIP 이메일 확인.

        Args:
            hours: 몇 시간 전까지 확인할지

        Returns:
            VIP 이메일 리스트
        """
        since = datetime.now() - timedelta(hours=hours)
        query = f'after:{since.strftime("%Y/%m/%d")} in:inbox'

        messages = self.gmail.list_messages(query=query, max_results=100)
        vip_emails = []

        for msg in messages:
            email = self.gmail.get_message(msg['id'])
            headers = {h['name']: h['value'] for h in email.get('payload', {}).get('headers', [])}

            sender = headers.get('From', '')
            subject = headers.get('Subject', '')
            is_vip, category = self.vip_classifier.classify(sender)

            if is_vip:
                labels = email.get('labelIds', [])
                vip_emails.append({
                    'id': msg['id'],
                    'sender': sender,
                    'subject': subject,
                    'category': category,
                    'is_unread': 'UNREAD' in labels,
                    'date': headers.get('Date', ''),
                })

        return vip_emails

    def summarize_important_emails(self, hours: int = 24) -> Dict:
        """
        중요 이메일 요약.

        Returns:
            {'vip_emails': [...], 'action_required': [...], 'urgent': [...]}
        """
        since = datetime.now() - timedelta(hours=hours)
        query = f'after:{since.strftime("%Y/%m/%d")} in:inbox'

        messages = self.gmail.list_messages(query=query, max_results=100)

        summary: Dict[str, List] = {'vip_emails': [], 'action_required': [], 'urgent': []}
        vip_config = self.vip_classifier.config
        urgent_keywords = vip_config.get('keywords', {}).get('urgent', [])
        action_keywords = vip_config.get('keywords', {}).get('action_required', [])

        for msg in messages:
            email = self.gmail.get_message(msg['id'])
            headers = {h['name']: h['value'] for h in email.get('payload', {}).get('headers', [])}

            sender = headers.get('From', '')
            subject = headers.get('Subject', '')
            labels = email.get('labelIds', [])

            email_info = {
                'sender': sender,
                'subject': subject,
                'is_unread': 'UNREAD' in labels,
                'id': msg['id'],
            }

            is_vip, category = self.vip_classifier.classify(sender)
            if is_vip:
                email_info['vip_category'] = category
                summary['vip_emails'].append(email_info)

            for keyword in urgent_keywords:
                if keyword in subject.lower():
                    summary['urgent'].append(email_info)
                    break

            for keyword in action_keywords:
                if keyword in subject or keyword in subject.lower():
                    summary['action_required'].append(email_info)
                    break

        return summary

    def create_task_from_email(
        self,
        email_subject: str,
        sender: str,
        due_date: Optional[datetime] = None,
        priority: Optional[int] = None,
    ) -> Dict:
        """
        이메일 내용으로 ClickUp 작업 생성.

        Args:
            email_subject: 이메일 제목
            sender: 발신자
            due_date: 마감일
            priority: 우선순위

        Returns:
            생성된 작업 정보
        """
        sender_name = sender.split('<')[0].strip().strip('"') if '<' in sender else sender
        task_name = f"{email_subject} (from: {sender_name})"

        return self.clickup.create_task(
            list_id=self._list_id,
            name=task_name,
            due_date=due_date,
            priority=priority,
            assignees=[self._user_id],
        )


if __name__ == '__main__':
    automation = EmailAutomation.create_default()

    print("=== VIP 이메일 체크 ===")
    vip_emails = automation.check_vip_emails(hours=24)
    print(f"VIP 이메일: {len(vip_emails)}개")
    for email in vip_emails:
        print(f"  - [{email['category']}] {email['sender']}: {email['subject']}")

    print("\n=== 중요 이메일 요약 ===")
    summary = automation.summarize_important_emails(hours=24)
    print(f"VIP: {len(summary['vip_emails'])}개")
    print(f"액션 필요: {len(summary['action_required'])}개")
    print(f"긴급: {len(summary['urgent'])}개")
