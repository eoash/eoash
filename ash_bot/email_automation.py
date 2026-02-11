"""
이메일 자동화 - 액션 아이템 추출 및 모니터링
"""
import os
import json
import re
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple

from ash_bot.integrations.gmail_client import GmailClient
from ash_bot.integrations.clickup_client import ClickUpClient
from ash_bot.integrations.slack_client import SlackClient


# 설정
CONFIG_DIR = Path(__file__).parent.parent / "config"
VIP_CONFIG = CONFIG_DIR / "vip_emails.json"

TEAM_ID = "90181381526"
USER_ID = "282830780"
LIST_ID = os.getenv('CLICKUP_DEFAULT_LIST_ID', '901811469193')


class EmailAutomation:
    """이메일 자동화 클래스"""

    def __init__(self):
        """초기화"""
        self.gmail = GmailClient()
        self.clickup = ClickUpClient()
        self.slack = SlackClient()
        self.vip_config = self._load_vip_config()

    def _load_vip_config(self) -> Dict:
        """VIP 설정 로드"""
        if VIP_CONFIG.exists():
            with open(VIP_CONFIG, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def is_vip_sender(self, sender_email: str) -> Tuple[bool, str]:
        """
        VIP 발신자인지 확인

        Returns:
            (is_vip, category) - VIP 여부와 카테고리
        """
        sender_lower = sender_email.lower()

        # 투자자
        for pattern in self.vip_config.get('investors', []):
            if pattern.lower() in sender_lower:
                return True, "investor"

        # 변호사
        for pattern in self.vip_config.get('lawyers', []):
            if pattern.lower() in sender_lower:
                return True, "lawyer"

        # 회계사
        for pattern in self.vip_config.get('accountants', []):
            if pattern.lower() in sender_lower:
                return True, "accountant"

        return False, ""

    def extract_action_items(self, subject: str, body: str) -> List[str]:
        """
        이메일에서 액션 아이템 추출

        간단한 규칙 기반 추출:
        - "~해주세요", "~부탁드립니다"
        - "검토", "승인", "확인" 등의 키워드
        """
        actions = []
        keywords = self.vip_config.get('keywords', {}).get('action_required', [])

        # 제목에서 액션 키워드 찾기
        for keyword in keywords:
            if keyword in subject or keyword.lower() in subject.lower():
                # 제목 자체가 액션 아이템
                actions.append(subject)
                break

        # 본문에서 "~해주세요", "~부탁드립니다" 패턴 찾기
        patterns = [
            r'(.{10,50}?(?:해주세요|부탁드립니다|바랍니다))',
            r'(.{10,50}?(?:please|kindly|could you))',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, body, re.IGNORECASE)
            for match in matches[:3]:  # 최대 3개
                actions.append(match.strip())

        return actions

    def check_vip_emails(self, hours: int = 24) -> List[Dict]:
        """
        최근 VIP 이메일 확인

        Args:
            hours: 몇 시간 전까지 확인할지

        Returns:
            VIP 이메일 리스트
        """
        # 시간 범위 계산
        since = datetime.now() - timedelta(hours=hours)
        query = f'after:{since.strftime("%Y/%m/%d")} in:inbox'

        messages = self.gmail.list_messages(query=query, max_results=100)

        vip_emails = []

        for msg in messages:
            email = self.gmail.get_message(msg['id'])
            headers = {h['name']: h['value'] for h in email.get('payload', {}).get('headers', [])}

            sender = headers.get('From', '')
            subject = headers.get('Subject', '')

            # VIP 발신자 체크
            is_vip, category = self.is_vip_sender(sender)

            if is_vip:
                # 읽음 여부
                labels = email.get('labelIds', [])
                is_unread = 'UNREAD' in labels

                vip_emails.append({
                    'id': msg['id'],
                    'sender': sender,
                    'subject': subject,
                    'category': category,
                    'is_unread': is_unread,
                    'date': headers.get('Date', '')
                })

        return vip_emails

    def summarize_important_emails(self, hours: int = 24) -> Dict:
        """
        중요 이메일 요약

        Returns:
            {
                'vip_emails': [...],
                'action_required': [...],
                'urgent': [...]
            }
        """
        since = datetime.now() - timedelta(hours=hours)
        query = f'after:{since.strftime("%Y/%m/%d")} in:inbox'

        messages = self.gmail.list_messages(query=query, max_results=100)

        summary = {
            'vip_emails': [],
            'action_required': [],
            'urgent': []
        }

        urgent_keywords = self.vip_config.get('keywords', {}).get('urgent', [])
        action_keywords = self.vip_config.get('keywords', {}).get('action_required', [])

        for msg in messages:
            email = self.gmail.get_message(msg['id'])
            headers = {h['name']: h['value'] for h in email.get('payload', {}).get('headers', [])}

            sender = headers.get('From', '')
            subject = headers.get('Subject', '')
            labels = email.get('labelIds', [])
            is_unread = 'UNREAD' in labels

            email_info = {
                'sender': sender,
                'subject': subject,
                'is_unread': is_unread,
                'id': msg['id']
            }

            # VIP 체크
            is_vip, category = self.is_vip_sender(sender)
            if is_vip:
                email_info['vip_category'] = category
                summary['vip_emails'].append(email_info)

            # 긴급 체크
            for keyword in urgent_keywords:
                if keyword in subject.lower():
                    summary['urgent'].append(email_info)
                    break

            # 액션 필요 체크
            for keyword in action_keywords:
                if keyword in subject or keyword in subject.lower():
                    summary['action_required'].append(email_info)
                    break

        return summary

    def create_task_from_email(self, email_subject: str, sender: str,
                               due_date: Optional[datetime] = None,
                               priority: Optional[int] = None) -> Dict:
        """
        이메일 내용으로 ClickUp 작업 생성

        Args:
            email_subject: 이메일 제목
            sender: 발신자
            due_date: 마감일
            priority: 우선순위

        Returns:
            생성된 작업 정보
        """
        # 발신자 이름 추출
        sender_name = sender
        if '<' in sender:
            sender_name = sender.split('<')[0].strip().strip('"')

        # 작업 제목 생성
        task_name = f"{email_subject} (from: {sender_name})"

        # 작업 생성
        task = self.clickup.create_task(
            list_id=LIST_ID,
            name=task_name,
            due_date=due_date,
            priority=priority,
            assignees=[USER_ID]
        )

        return task


if __name__ == '__main__':
    # 테스트
    automation = EmailAutomation()

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
