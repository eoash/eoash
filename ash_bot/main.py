"""Main orchestration for AR automation workflow."""

from typing import Dict, Any, Optional
from datetime import datetime
import json
import traceback
from pathlib import Path

from ash_bot.config import (
    BillComConfig, PlaidConfig, SlackConfig, NotionConfig, AGENT_DIR, ensure_dirs
)
from ash_bot.integrations import (
    BillComClient, PlaidClient, SlackClient, NotionClient
)
from ash_bot.core import PaymentMatcher, ARReporter, InvoiceUpdater
from ash_bot.utils.logger import get_logger

logger = get_logger("ar_automation")


class ARAutomationSystem:
    """Main AR automation orchestrator."""

    def __init__(
        self,
        dry_run: bool = False,
        bill_com: Optional[BillComClient] = None,
        plaid: Optional[PlaidClient] = None,
        slack: Optional[SlackClient] = None,
        notion: Optional[NotionClient] = None,
    ):
        """
        Initialize AR automation system.

        Args:
            dry_run: If True, don't update Bill.com, just simulate
            bill_com: BillComClient instance (created if not provided)
            plaid: PlaidClient instance (created if not provided)
            slack: SlackClient instance (created if not provided)
            notion: NotionClient instance (created if not provided)
        """
        self.dry_run = dry_run
        self.start_time = datetime.now()
        ensure_dirs()

        # Initialize clients (DI with defaults)
        logger.info("Initializing AR automation system...")
        self.bill_com = bill_com or BillComClient()
        self.plaid = plaid or PlaidClient()
        self.slack = slack or SlackClient()
        self.notion = notion or NotionClient()

        # Initialize business logic
        self.matcher = PaymentMatcher()
        self.reporter = ARReporter()
        self.updater = InvoiceUpdater(self.bill_com)

        # Validation
        self._validate_configuration()

    def _validate_configuration(self) -> None:
        """Validate all API credentials are configured."""
        logger.info("Validating configuration...")

        issues = []

        try:
            BillComConfig.validate()
        except ValueError as e:
            issues.append(f"Bill.com: {str(e)}")

        try:
            PlaidConfig.validate()
        except ValueError as e:
            issues.append(f"Plaid: {str(e)}")

        try:
            SlackConfig.validate()
        except ValueError as e:
            issues.append(f"Slack: {str(e)}")

        try:
            NotionConfig.validate()
        except ValueError as e:
            issues.append(f"Notion: {str(e)}")

        if issues:
            logger.warning("Configuration issues found:")
            for issue in issues:
                logger.warning(f"  - {issue}")
            logger.warning("System will continue with available services")
        else:
            logger.info("All configurations validated successfully")

    def run_daily_ar_check(self) -> Dict[str, Any]:
        """
        Execute daily AR check workflow.

        Returns:
            Workflow result summary
        """
        logger.info("Starting daily AR check workflow")

        result = {
            "workflow": "daily_ar_check",
            "start_time": self.start_time.isoformat(),
            "status": "pending",
            "errors": [],
            "stages": {}
        }

        try:
            # Stage 1: Fetch outstanding invoices
            result["stages"]["fetch_invoices"] = self._stage_fetch_invoices()

            # Stage 2: Fetch recent transactions
            result["stages"]["fetch_transactions"] = self._stage_fetch_transactions()

            # Stage 3: Match payments to invoices
            result["stages"]["matching"] = self._stage_matching(result)

            # Stage 4: Update Bill.com
            result["stages"]["update_billcom"] = self._stage_update_billcom(result)

            # Stage 5: Generate report
            result["stages"]["generate_report"] = self._stage_generate_report(result)

            # Stage 6: Send notifications
            result["stages"]["send_notifications"] = self._stage_send_notifications(result)

            result["status"] = "completed"

        except Exception as e:
            logger.error(f"Workflow error: {str(e)}")
            logger.error(traceback.format_exc())
            result["status"] = "failed"
            result["errors"].append(str(e))

            # Try to send error alert
            self._send_error_alert(result)

        # Save run log
        self._save_run_log(result)

        logger.info(f"Daily AR check workflow completed with status: {result['status']}")
        return result

    def run_weekly_ar_report(self) -> Dict[str, Any]:
        """
        Execute weekly AR report workflow.

        Returns:
            Workflow result summary
        """
        logger.info("Starting weekly AR report workflow")

        result = {
            "workflow": "weekly_ar_report",
            "start_time": self.start_time.isoformat(),
            "status": "pending",
            "errors": [],
            "stages": {}
        }

        try:
            # Fetch data
            result["stages"]["fetch_invoices"] = self._stage_fetch_invoices()

            # Get week's transactions (from multiple daily runs)
            # This is simplified - in production would aggregate daily logs
            result["stages"]["fetch_transactions"] = self._stage_fetch_transactions(days=7)

            # Match and generate weekly report
            result["stages"]["matching"] = self._stage_matching(result)
            result["stages"]["generate_report"] = self._stage_generate_report(
                result, report_type="weekly"
            )

            # Send weekly notifications
            result["stages"]["send_notifications"] = self._stage_send_notifications(
                result, report_type="weekly"
            )

            result["status"] = "completed"

        except Exception as e:
            logger.error(f"Workflow error: {str(e)}")
            result["status"] = "failed"
            result["errors"].append(str(e))
            self._send_error_alert(result)

        self._save_run_log(result)
        logger.info(f"Weekly AR report workflow completed with status: {result['status']}")
        return result

    def _stage_fetch_invoices(self) -> Dict[str, Any]:
        """Stage: Fetch outstanding invoices from Bill.com."""
        logger.info("Stage: Fetching outstanding invoices")

        try:
            invoices = self.bill_com.get_outstanding_invoices()

            return {
                "status": "success",
                "invoice_count": len(invoices),
                "total_outstanding": sum(inv.amount for inv in invoices),
                "invoices": invoices
            }

        except Exception as e:
            logger.error(f"Error fetching invoices: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "invoices": []
            }

    def _stage_fetch_transactions(self, days: int = 7) -> Dict[str, Any]:
        """Stage: Fetch recent bank transactions."""
        logger.info(f"Stage: Fetching transactions from last {days} days")

        try:
            transactions = self.plaid.get_recent_transactions(days=days)

            # Filter to incoming payments
            payments = self.plaid.filter_incoming_payments(transactions)

            return {
                "status": "success",
                "transaction_count": len(transactions),
                "payment_count": len(payments),
                "payments": payments
            }

        except Exception as e:
            logger.error(f"Error fetching transactions: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "payments": []
            }

    def _stage_matching(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Stage: Match payments to invoices."""
        logger.info("Stage: Matching payments to invoices")

        try:
            invoices = result["stages"]["fetch_invoices"].get("invoices", [])
            payments = result["stages"]["fetch_transactions"].get("payments", [])

            if not invoices or not payments:
                return {
                    "status": "success",
                    "match_count": 0,
                    "matches": [],
                    "unmatched": payments
                }

            matches, unmatched_candidates = self.matcher.match_payments_to_invoices(
                payments, invoices
            )

            summary = self.matcher.get_match_summary(matches)

            return {
                "status": "success",
                "match_count": len(matches),
                "unmatched_count": len(unmatched_candidates),
                "summary": summary,
                "matches": matches,
                "unmatched_candidates": unmatched_candidates
            }

        except Exception as e:
            logger.error(f"Error matching payments: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "matches": []
            }

    def _stage_update_billcom(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Stage: Update Bill.com invoice statuses."""
        logger.info("Stage: Updating Bill.com invoices")

        try:
            matches = result["stages"]["matching"].get("matches", [])

            if not matches:
                return {
                    "status": "success",
                    "updated_count": 0,
                    "updates": None
                }

            updates = self.updater.update_from_matches(matches, dry_run=self.dry_run)

            return {
                "status": "success" if updates["failed"] == 0 else "partial",
                "updated_count": updates["successful"],
                "failed_count": updates["failed"],
                "updates": updates
            }

        except Exception as e:
            logger.error(f"Error updating Bill.com: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "updates": None
            }

    def _stage_generate_report(
        self,
        result: Dict[str, Any],
        report_type: str = "daily"
    ) -> Dict[str, Any]:
        """Stage: Generate AR report."""
        logger.info(f"Stage: Generating {report_type} report")

        try:
            matches = result["stages"]["matching"].get("matches", [])
            invoices = result["stages"]["fetch_invoices"].get("invoices", [])

            if report_type == "daily":
                report = self.reporter.generate_daily_report(matches, invoices)
            else:
                report = self.reporter.generate_weekly_report(matches, invoices)

            return {
                "status": "success",
                "report": report
            }

        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "report": None
            }

    def _stage_send_notifications(
        self,
        result: Dict[str, Any],
        report_type: str = "daily"
    ) -> Dict[str, Any]:
        """Stage: Send notifications to Slack and Notion."""
        logger.info("Stage: Sending notifications")

        try:
            report = result["stages"]["generate_report"].get("report")

            if not report:
                return {"status": "success", "notifications_sent": 0}

            sent = 0

            # Send to Slack
            if self.slack.client:
                message = self.reporter.format_report_for_slack(report)

                if report_type == "daily":
                    self.slack.send_daily_report(message)
                else:
                    self.slack.send_weekly_report(message)

                sent += 1

                # 미매칭 건 후보군 알림 (daily만)
                if report_type == "daily":
                    unmatched_candidates = result["stages"]["matching"].get(
                        "unmatched_candidates", []
                    )
                    if unmatched_candidates:
                        self.slack.send_unmatched_alert(unmatched_candidates)
                        sent += 1

            # Send to Notion
            if self.notion.client:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
                title = f"{report_type.capitalize()} AR Report - {timestamp}"

                self.notion.create_daily_report_page(title, report)
                sent += 1

            return {
                "status": "success",
                "notifications_sent": sent
            }

        except Exception as e:
            logger.error(f"Error sending notifications: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "notifications_sent": 0
            }

    def _send_error_alert(self, result: Dict[str, Any]) -> None:
        """Send error alert to Slack."""
        try:
            if self.slack.client:
                errors = ", ".join(result.get("errors", []))
                self.slack.send_error_alert(
                    error_message=errors,
                    context=result.get("workflow", "unknown")
                )
        except Exception as e:
            logger.error(f"Error sending error alert: {str(e)}")

    def _save_run_log(self, result: Dict[str, Any]) -> None:
        """Save run log to agent memory directory."""
        try:
            log_dir = AGENT_DIR / "memory"
            log_dir.mkdir(parents=True, exist_ok=True)

            # Save current run
            run_log = log_dir / f"{self.start_time.strftime('%Y%m%d_%H%M%S')}_run.json"

            with open(run_log, "w") as f:
                json.dump(result, f, indent=2, default=str)

            logger.info(f"Saved run log to {run_log}")

            # Update last_run.json
            last_run_file = log_dir / "last_run.json"

            with open(last_run_file, "w") as f:
                json.dump({
                    "timestamp": datetime.now().isoformat(),
                    "workflow": result.get("workflow"),
                    "status": result.get("status"),
                    "stages": {
                        k: {"status": v.get("status")} for k, v in result.get("stages", {}).items()
                    }
                }, f, indent=2)

            logger.info(f"Updated last_run.json")

        except Exception as e:
            logger.error(f"Error saving run log: {str(e)}")
