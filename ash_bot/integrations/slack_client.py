"""Slack API integration for notifications."""

from typing import Optional
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from ash_bot.config import SlackConfig
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


class SlackClient:
    """Slack API client for sending notifications."""

    def __init__(self):
        """Initialize Slack client."""
        self.token = SlackConfig.BOT_TOKEN
        self.channel_daily = SlackConfig.CHANNEL_DAILY
        self.channel_alerts = SlackConfig.CHANNEL_ALERTS

        if self.token:
            self.client = WebClient(token=self.token)
        else:
            logger.warning("Slack bot token not configured")
            self.client = None

    def send_message(
        self,
        channel: str,
        text: str,
        blocks: Optional[list] = None
    ) -> bool:
        """
        Send message to Slack channel.

        Args:
            channel: Channel name or ID
            text: Message text (fallback)
            blocks: Slack Block Kit blocks (optional)

        Returns:
            True if successful, False otherwise
        """
        if not self.client:
            logger.error("Slack client not configured")
            return False

        try:
            response = self.client.chat_postMessage(
                channel=channel,
                text=text,
                blocks=blocks
            )

            logger.info(f"Sent message to {channel}")
            return True

        except SlackApiError as e:
            logger.error(f"Slack API error: {e.response['error']}")
            return False

    def send_daily_report(self, report_text: str, channel: Optional[str] = None) -> bool:
        """
        Send daily AR report to Slack.

        Args:
            report_text: Report content in markdown
            channel: Channel to send to (default: configured daily channel)

        Returns:
            True if successful
        """
        channel = channel or self.channel_daily

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "📊 EO Studio - Daily AR Update"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": report_text
                }
            }
        ]

        return self.send_message(channel, "Daily AR Report", blocks=blocks)

    def send_weekly_report(self, report_text: str, channel: Optional[str] = None) -> bool:
        """
        Send weekly AR report to Slack.

        Args:
            report_text: Report content in markdown
            channel: Channel to send to (default: configured daily channel)

        Returns:
            True if successful
        """
        channel = channel or self.channel_daily

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "📈 EO Studio - Weekly AR Report"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": report_text
                }
            }
        ]

        return self.send_message(channel, "Weekly AR Report", blocks=blocks)

    def send_alert(self, message: str, urgent: bool = False) -> bool:
        """
        Send alert to Slack.

        Args:
            message: Alert message
            urgent: If True, uses alerts channel

        Returns:
            True if successful
        """
        channel = self.channel_alerts if urgent else self.channel_daily

        emoji = "🚨" if urgent else "⚠️"
        text = f"{emoji} {message}"

        return self.send_message(channel, text)

    def send_unmatched_alert(self, unmatched_candidates: list) -> bool:
        """
        매칭 실패한 입금 건과 상위 3개 후보군을 Slack에 전송.

        Args:
            unmatched_candidates: CandidateMatch 객체 목록

        Returns:
            True if successful
        """
        if not unmatched_candidates:
            return True

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"⚠️ 수동 확인 필요 - {len(unmatched_candidates)}건 미매칭"
                }
            },
            {"type": "divider"}
        ]

        for cm in unmatched_candidates:
            payment = cm.payment

            # 입금 정보 헤더
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"*💵 입금:* ${payment.amount:,.2f} "
                        f"| {payment.date} "
                        f"| `{payment.merchant_name or payment.description}`"
                    )
                }
            })

            # 후보군 목록
            if cm.candidates:
                candidate_lines = []
                for i, (invoice, score) in enumerate(cm.candidates, 1):
                    bar = "🟢" if score >= 0.7 else ("🟡" if score >= 0.4 else "🔴")
                    candidate_lines.append(
                        f"{i}. {bar} INV-{invoice.invoice_number} "
                        f"| {invoice.customer_name} "
                        f"| ${invoice.amount:,.2f} "
                        f"| 신뢰도 {score:.0%}"
                    )
                blocks.append({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "후보 청구서:\n" + "\n".join(candidate_lines)
                    }
                })
            else:
                blocks.append({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "_후보 청구서 없음 - 신규 고객 입금일 수 있음_"
                    }
                })

            blocks.append({"type": "divider"})

        return self.send_message(
            self.channel_alerts,
            f"미매칭 입금 {len(unmatched_candidates)}건 확인 필요",
            blocks=blocks
        )

    def send_error_alert(self, error_message: str, context: str = "") -> bool:
        """
        Send error alert to Slack.

        Args:
            error_message: Error details
            context: Context about what failed

        Returns:
            True if successful
        """
        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"🔴 *AR Automation Error*\n\n*Context:* {context}\n\n*Error:* {error_message}"
                }
            }
        ]

        return self.send_message(
            self.channel_alerts,
            "AR Automation Error",
            blocks=blocks
        )

    def test_connection(self) -> bool:
        """Test Slack connection."""
        if not self.client:
            logger.warning("Slack client not configured")
            return False

        try:
            response = self.client.auth_test()
            logger.info(f"Slack connection successful: {response.get('user_id')}")
            return True
        except SlackApiError as e:
            logger.error(f"Slack connection failed: {e.response['error']}")
            return False

    def get_user_id_by_email(self, email: str) -> Optional[str]:
        """
        이메일로 사용자 ID 조회

        Args:
            email: 사용자 이메일

        Returns:
            User ID 또는 None
        """
        if not self.client:
            logger.error("Slack client not configured")
            return None

        try:
            response = self.client.users_lookupByEmail(email=email)
            return response['user']['id']
        except SlackApiError as e:
            logger.error(f"사용자 조회 오류: {e.response['error']}")
            return None

    def open_dm_channel(self, user_id: str) -> Optional[str]:
        """
        DM 채널 열기

        Args:
            user_id: 사용자 ID

        Returns:
            DM 채널 ID 또는 None
        """
        if not self.client:
            logger.error("Slack client not configured")
            return None

        try:
            response = self.client.conversations_open(users=[user_id])
            return response['channel']['id']
        except SlackApiError as e:
            logger.error(f"DM 채널 열기 오류: {e.response['error']}")
            return None

    def send_dm(self, user_id: str, text: str, blocks: Optional[list] = None) -> bool:
        """
        DM 보내기

        Args:
            user_id: 사용자 ID
            text: 메시지 텍스트
            blocks: Slack Block Kit (선택사항)

        Returns:
            True if successful
        """
        if not self.client:
            logger.error("Slack client not configured")
            return False

        try:
            # DM 채널 열기
            channel_id = self.open_dm_channel(user_id)
            if not channel_id:
                return False

            # 메시지 전송
            kwargs = {
                "channel": channel_id,
                "text": text
            }
            if blocks:
                kwargs['blocks'] = blocks

            response = self.client.chat_postMessage(**kwargs)
            logger.info(f"DM 전송 성공: {user_id}")
            return True

        except SlackApiError as e:
            logger.error(f"DM 전송 오류: {e.response['error']}")
            return False

    def send_todo_list_dm(self, user_id: str, tasks: list) -> bool:
        """
        투두리스트 DM 보내기

        Args:
            user_id: 사용자 ID
            tasks: ClickUp 작업 리스트

        Returns:
            True if successful
        """
        if not tasks:
            text = "📋 *오늘 할 일*\n\n오늘 마감 작업이 없습니다! 🎉"
            return self.send_dm(user_id, text)

        # 작업 포맷팅
        from datetime import datetime

        message_lines = ["📋 *오늘 할 일*\n"]

        for i, task in enumerate(tasks, 1):
            name = task.get('name', 'Untitled')
            status = task.get('status', {}).get('status', 'Unknown')
            priority = task.get('priority')
            url = task.get('url', '')

            # 우선순위 표시 (ClickUp API는 priority를 dict로 반환)
            priority_map = {
                '1': '🔴',
                '2': '🟠',
                '3': '🟡',
                '4': '🟢'
            }
            if isinstance(priority, dict):
                priority_id = str(priority.get('id', ''))
            else:
                priority_id = str(priority) if priority else ''
            priority_emoji = priority_map.get(priority_id, '⚪')

            # 마감일
            due_date = task.get('due_date')
            if due_date:
                due_dt = datetime.fromtimestamp(int(due_date) / 1000)
                due_str = due_dt.strftime('%H:%M')
            else:
                due_str = '시간 미정'

            # 링크 포맷
            task_link = f"<{url}|{name}>" if url else name

            message_lines.append(
                f"{i}. {priority_emoji} {task_link} - {status} (마감: {due_str})"
            )

        text = "\n".join(message_lines)
        return self.send_dm(user_id, text)
