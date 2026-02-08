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
