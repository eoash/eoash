"""AR report generation."""

from typing import List, Dict, Any
from datetime import datetime, timedelta
import json
from ash_bot.integrations.bill_com import Invoice
from ash_bot.core.matcher import MatchResult
from ash_bot.config import ARConfig
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


class ARReporter:
    """Generate AR reports for Slack and Notion."""

    def __init__(self):
        """Initialize AR reporter."""
        self.aging_buckets = ARConfig.AGING_BUCKETS
        self.timezone = ARConfig.TIMEZONE

    def generate_daily_report(
        self,
        matches: List[MatchResult],
        outstanding_invoices: List[Invoice]
    ) -> Dict[str, Any]:
        """
        Generate daily AR report.

        Args:
            matches: Today's matched payments
            outstanding_invoices: Current outstanding invoices

        Returns:
            Dictionary with report data
        """
        logger.info("Generating daily AR report")

        # Calculate metrics
        new_payments = self._format_new_payments(matches)
        total_paid = sum(m.payment.amount for m in matches)

        outstanding = self._calculate_outstanding(outstanding_invoices)
        aging = self._calculate_aging(outstanding_invoices)

        # Build report
        report = {
            "type": "daily",
            "generated_at": datetime.now().isoformat(),
            "summary": f"✅ *{len(matches)} payments* processed, *${total_paid:,.2f}* collected",
            "new_payments": new_payments,
            "total_paid_today": total_paid,
            "outstanding_total": outstanding["total"],
            "outstanding_by_aging": outstanding["by_aging"],
            "aging_summary": aging,
            "metrics": {
                "total_invoices": len(outstanding_invoices),
                "new_payments_count": len(matches),
                "match_types": self._get_match_types(matches)
            }
        }

        return report

    def generate_weekly_report(
        self,
        week_matches: List[MatchResult],
        outstanding_invoices: List[Invoice],
        previous_week_total: float = 0
    ) -> Dict[str, Any]:
        """
        Generate weekly AR report with trends.

        Args:
            week_matches: Payments from the week
            outstanding_invoices: Current outstanding invoices
            previous_week_total: Total collected previous week (for comparison)

        Returns:
            Dictionary with report data
        """
        logger.info("Generating weekly AR report")

        # Calculate metrics
        total_collected = sum(m.payment.amount for m in week_matches)
        week_over_week_change = total_collected - previous_week_total

        outstanding = self._calculate_outstanding(outstanding_invoices)
        aging = self._calculate_aging(outstanding_invoices)

        # Top overdue invoices
        overdue = [
            inv for inv in outstanding_invoices
            if self._get_days_overdue(inv) > 0
        ]
        top_overdue = sorted(overdue, key=self._get_days_overdue, reverse=True)[:5]

        report = {
            "type": "weekly",
            "generated_at": datetime.now().isoformat(),
            "summary": f"💰 *${total_collected:,.2f}* collected this week",
            "week_metrics": {
                "total_collected": total_collected,
                "payments_processed": len(week_matches),
                "week_over_week_change": week_over_week_change,
                "wow_change_pct": (
                    (week_over_week_change / previous_week_total * 100)
                    if previous_week_total > 0 else 0
                )
            },
            "outstanding_total": outstanding["total"],
            "outstanding_by_aging": outstanding["by_aging"],
            "aging_analysis": aging,
            "top_overdue_invoices": [
                {
                    "invoice_number": inv.invoice_number,
                    "customer": inv.customer_name,
                    "amount": inv.amount,
                    "days_overdue": self._get_days_overdue(inv)
                }
                for inv in top_overdue
            ],
            "metrics": {
                "total_invoices": len(outstanding_invoices),
                "overdue_invoices": len(overdue),
                "collection_rate": self._calculate_collection_rate(
                    total_collected, outstanding["total"]
                )
            }
        }

        return report

    def format_report_for_slack(self, report: Dict[str, Any]) -> str:
        """
        Format report for Slack message (markdown).

        Args:
            report: Report dictionary

        Returns:
            Formatted message string
        """
        lines = []

        if report["type"] == "daily":
            lines.append(f"*Date:* {report['generated_at'][:10]}")
            lines.append("")
            lines.append("✅ *New Payments Received*")
            if report["new_payments"]:
                lines.extend(report["new_payments"])
            else:
                lines.append("_No payments today_")

            lines.append("")
            lines.append(f"*Total Collected:* ${report['total_paid_today']:,.2f}")

        else:  # weekly
            lines.append(f"*Week Ending:* {report['generated_at'][:10]}")
            lines.append("")
            lines.append("💰 *Collection Summary*")
            lines.append(f"  Total Collected: ${report['week_metrics']['total_collected']:,.2f}")
            lines.append(f"  Payments: {report['week_metrics']['payments_processed']}")
            wow = report['week_metrics']['wow_change_pct']
            wow_emoji = "📈" if wow >= 0 else "📉"
            lines.append(f"  WoW Change: {wow_emoji} {wow:+.1f}%")

            if report["top_overdue_invoices"]:
                lines.append("")
                lines.append("🚨 *Top Overdue Invoices*")
                for inv in report["top_overdue_invoices"][:3]:
                    lines.append(
                        f"  • Invoice #{inv['invoice_number']}: "
                        f"${inv['amount']:,.2f} ({inv['customer']}) "
                        f"- {inv['days_overdue']} days overdue"
                    )

        lines.append("")
        lines.append("⏳ *Outstanding AR*")
        for bucket, amount in report["outstanding_by_aging"].items():
            bucket_label = bucket.replace("_", "-")
            lines.append(f"  {bucket_label}: ${amount:,.2f}")
        lines.append(f"  *Total:* ${report['outstanding_total']:,.2f}")

        return "\n".join(lines)

    def _format_new_payments(self, matches: List[MatchResult]) -> List[str]:
        """Format new payments as list items."""
        items = []
        for match in sorted(matches, key=lambda m: m.payment.amount, reverse=True):
            items.append(
                f"  • Invoice #{match.invoice.invoice_number}: "
                f"${match.payment.amount:,.2f} "
                f"({match.invoice.customer_name})"
            )
        return items

    def _calculate_outstanding(
        self,
        invoices: List[Invoice]
    ) -> Dict[str, Any]:
        """Calculate outstanding AR by aging bucket."""
        by_aging = {
            bucket: 0.0 for bucket in self.aging_buckets.keys()
        }
        total = 0.0

        for invoice in invoices:
            if invoice.status != "unpaid":
                continue

            days_due = self._get_days_overdue(invoice)

            for bucket, (min_days, max_days) in self.aging_buckets.items():
                if min_days <= days_due <= max_days:
                    by_aging[bucket] += invoice.amount
                    break

            total += invoice.amount

        return {
            "total": total,
            "by_aging": by_aging
        }

    def _calculate_aging(self, invoices: List[Invoice]) -> Dict[str, Any]:
        """Calculate aging analysis."""
        aging = {}

        for bucket, (min_days, max_days) in self.aging_buckets.items():
            count = 0
            total = 0.0
            for invoice in invoices:
                if invoice.status == "unpaid":
                    days = self._get_days_overdue(invoice)
                    if min_days <= days <= max_days:
                        count += 1
                        total += invoice.amount

            aging[bucket] = {
                "count": count,
                "total": total,
                "percentage": 0.0
            }

        # Calculate percentages
        total_outstanding = sum(b["total"] for b in aging.values())
        if total_outstanding > 0:
            for bucket in aging.values():
                bucket["percentage"] = (bucket["total"] / total_outstanding) * 100

        return aging

    def _get_days_overdue(self, invoice: Invoice) -> int:
        """Calculate days overdue for an invoice."""
        due_date = datetime.strptime(invoice.due_date, "%Y-%m-%d")
        days_overdue = (datetime.now() - due_date).days
        return max(0, days_overdue)

    def _get_match_types(self, matches: List[MatchResult]) -> Dict[str, int]:
        """Count matches by type."""
        types = {}
        for match in matches:
            types[match.match_type] = types.get(match.match_type, 0) + 1
        return types

    def _calculate_collection_rate(self, collected: float, outstanding: float) -> float:
        """Calculate collection rate percentage."""
        if collected + outstanding == 0:
            return 0.0
        return (collected / (collected + outstanding)) * 100

    def save_report(self, report: Dict[str, Any], filename: str) -> bool:
        """Save report to JSON file."""
        try:
            from ash_bot.config import REPORTS_DIR

            report_dir = REPORTS_DIR / report["type"]
            report_dir.mkdir(parents=True, exist_ok=True)

            filepath = report_dir / filename

            with open(filepath, "w") as f:
                json.dump(report, f, indent=2, default=str)

            logger.info(f"Saved report to {filepath}")
            return True

        except Exception as e:
            logger.error(f"Error saving report: {str(e)}")
            return False
