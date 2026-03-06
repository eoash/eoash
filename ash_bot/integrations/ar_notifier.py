"""AR 전용 Slack 알림 — SlackClient 위에 AR 비즈니스 포맷팅을 담당."""

from typing import Optional

from ash_bot.integrations.slack_client import SlackClient
from ash_bot.config import SlackConfig
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


class ARNotifier:
    """AR 워크플로우 전용 Slack 알림 전송."""

    def __init__(self, slack: Optional[SlackClient] = None):
        self._slack = slack or SlackClient()
        self._channel_daily = SlackConfig.CHANNEL_DAILY
        self._channel_alerts = SlackConfig.CHANNEL_ALERTS

    def send_daily_report(self, report_text: str, channel: Optional[str] = None) -> bool:
        """일별 AR 리포트 전송."""
        target = channel or self._channel_daily
        blocks = [
            {"type": "header", "text": {"type": "plain_text", "text": "📊 EO Studio - Daily AR Update"}},
            {"type": "section", "text": {"type": "mrkdwn", "text": report_text}},
        ]
        return self._slack.send_message(target, "Daily AR Report", blocks=blocks)

    def send_weekly_report(self, report_text: str, channel: Optional[str] = None) -> bool:
        """주별 AR 리포트 전송."""
        target = channel or self._channel_daily
        blocks = [
            {"type": "header", "text": {"type": "plain_text", "text": "📈 EO Studio - Weekly AR Report"}},
            {"type": "section", "text": {"type": "mrkdwn", "text": report_text}},
        ]
        return self._slack.send_message(target, "Weekly AR Report", blocks=blocks)

    def send_unmatched_alert(self, unmatched_candidates: list) -> bool:
        """매칭 실패 입금 건과 상위 후보군 알림 전송."""
        if not unmatched_candidates:
            return True

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"⚠️ 수동 확인 필요 - {len(unmatched_candidates)}건 미매칭",
                },
            },
            {"type": "divider"},
        ]

        for cm in unmatched_candidates:
            payment = cm.payment
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"*💵 입금:* ${payment.amount:,.2f} "
                        f"| {payment.date} "
                        f"| `{payment.merchant_name or payment.description}`"
                    ),
                },
            })

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
                    "text": {"type": "mrkdwn", "text": "후보 청구서:\n" + "\n".join(candidate_lines)},
                })
            else:
                blocks.append({
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": "_후보 청구서 없음 - 신규 고객 입금일 수 있음_"},
                })

            blocks.append({"type": "divider"})

        return self._slack.send_message(
            self._channel_alerts,
            f"미매칭 입금 {len(unmatched_candidates)}건 확인 필요",
            blocks=blocks,
        )

    def send_error_alert(self, error_message: str, context: str = "") -> bool:
        """AR 자동화 에러 알림 전송."""
        blocks = [{
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"🔴 *AR Automation Error*\n\n*Context:* {context}\n\n*Error:* {error_message}",
            },
        }]
        return self._slack.send_message(self._channel_alerts, "AR Automation Error", blocks=blocks)
