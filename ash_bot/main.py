"""Main orchestration for AR automation workflow."""

from typing import Dict, Any, Optional
from datetime import datetime
import traceback

from ash_bot.config import AGENT_DIR, ensure_dirs
from ash_bot.integrations import BillComClient, PlaidClient, SlackClient, NotionClient
from ash_bot.integrations.ar_notifier import ARNotifier
from ash_bot.core import PaymentMatcher, ARReporter, InvoiceUpdater
from ash_bot.core.run_logger import RunLogger
from ash_bot.core.config_validator import ConfigValidator
from ash_bot.utils.logger import get_logger

logger = get_logger("ar_automation")


class ARAutomationSystem:
    """AR 자동화 워크플로우 오케스트레이터."""

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
            dry_run: True면 Bill.com 업데이트를 시뮬레이션만 수행
            bill_com / plaid / slack / notion: 테스트용 DI. None이면 기본 인스턴스 생성.
        """
        self.dry_run = dry_run
        self.start_time = datetime.now()
        ensure_dirs()

        logger.info("Initializing AR automation system...")
        self.bill_com = bill_com or BillComClient()
        self.plaid = plaid or PlaidClient()
        self.slack = slack or SlackClient()
        self.notion = notion or NotionClient()

        self.matcher = PaymentMatcher()
        self.reporter = ARReporter()
        self.updater = InvoiceUpdater(self.bill_com)
        self.notifier = ARNotifier(self.slack)
        self._run_logger = RunLogger(AGENT_DIR / "memory")
        self._validator = ConfigValidator.default()

        self._validator.validate_all()

    # ── 퍼블릭 워크플로우 ──────────────────────────────────

    def run_daily_ar_check(self) -> Dict[str, Any]:
        """일별 AR 체크 워크플로우 실행."""
        logger.info("Starting daily AR check workflow")

        result: Dict[str, Any] = {
            "workflow": "daily_ar_check",
            "start_time": self.start_time.isoformat(),
            "status": "pending",
            "errors": [],
            "stages": {},
        }

        try:
            result["stages"]["fetch_invoices"] = self._stage_fetch_invoices()
            result["stages"]["fetch_transactions"] = self._stage_fetch_transactions()
            result["stages"]["matching"] = self._stage_matching(result)
            result["stages"]["update_billcom"] = self._stage_update_billcom(result)
            result["stages"]["generate_report"] = self._stage_generate_report(result)
            result["stages"]["send_notifications"] = self._stage_send_notifications(result)
            result["status"] = "completed"

        except Exception as e:
            logger.error(f"Workflow error: {e}")
            logger.error(traceback.format_exc())
            result["status"] = "failed"
            result["errors"].append(str(e))
            self._send_error_alert(result)

        self._run_logger.save(result, self.start_time)
        logger.info(f"Daily AR check completed: {result['status']}")
        return result

    def run_weekly_ar_report(self) -> Dict[str, Any]:
        """주별 AR 리포트 워크플로우 실행."""
        logger.info("Starting weekly AR report workflow")

        result: Dict[str, Any] = {
            "workflow": "weekly_ar_report",
            "start_time": self.start_time.isoformat(),
            "status": "pending",
            "errors": [],
            "stages": {},
        }

        try:
            result["stages"]["fetch_invoices"] = self._stage_fetch_invoices()
            result["stages"]["fetch_transactions"] = self._stage_fetch_transactions(days=7)
            result["stages"]["matching"] = self._stage_matching(result)
            result["stages"]["generate_report"] = self._stage_generate_report(
                result, report_type="weekly"
            )
            result["stages"]["send_notifications"] = self._stage_send_notifications(
                result, report_type="weekly"
            )
            result["status"] = "completed"

        except Exception as e:
            logger.error(f"Workflow error: {e}")
            result["status"] = "failed"
            result["errors"].append(str(e))
            self._send_error_alert(result)

        self._run_logger.save(result, self.start_time)
        logger.info(f"Weekly AR report completed: {result['status']}")
        return result

    # ── 스테이지 메서드 ────────────────────────────────────

    def _stage_fetch_invoices(self) -> Dict[str, Any]:
        logger.info("Stage: Fetching outstanding invoices")
        try:
            invoices = self.bill_com.get_outstanding_invoices()
            return {
                "status": "success",
                "invoice_count": len(invoices),
                "total_outstanding": sum(inv.amount for inv in invoices),
                "invoices": invoices,
            }
        except Exception as e:
            logger.error(f"Error fetching invoices: {e}")
            return {"status": "failed", "error": str(e), "invoices": []}

    def _stage_fetch_transactions(self, days: int = 7) -> Dict[str, Any]:
        logger.info(f"Stage: Fetching transactions from last {days} days")
        try:
            transactions = self.plaid.get_recent_transactions(days=days)
            payments = self.plaid.filter_incoming_payments(transactions)
            return {
                "status": "success",
                "transaction_count": len(transactions),
                "payment_count": len(payments),
                "payments": payments,
            }
        except Exception as e:
            logger.error(f"Error fetching transactions: {e}")
            return {"status": "failed", "error": str(e), "payments": []}

    def _stage_matching(self, result: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Stage: Matching payments to invoices")
        try:
            invoices = result["stages"]["fetch_invoices"].get("invoices", [])
            payments = result["stages"]["fetch_transactions"].get("payments", [])

            if not invoices or not payments:
                return {"status": "success", "match_count": 0, "matches": [], "unmatched": payments}

            matches, unmatched_candidates = self.matcher.match_payments_to_invoices(
                payments, invoices
            )
            return {
                "status": "success",
                "match_count": len(matches),
                "unmatched_count": len(unmatched_candidates),
                "summary": self.matcher.get_match_summary(matches),
                "matches": matches,
                "unmatched_candidates": unmatched_candidates,
            }
        except Exception as e:
            logger.error(f"Error matching payments: {e}")
            return {"status": "failed", "error": str(e), "matches": []}

    def _stage_update_billcom(self, result: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Stage: Updating Bill.com invoices")
        try:
            matches = result["stages"]["matching"].get("matches", [])
            if not matches:
                return {"status": "success", "updated_count": 0, "updates": None}

            updates = self.updater.update_from_matches(matches, dry_run=self.dry_run)
            return {
                "status": "success" if updates["failed"] == 0 else "partial",
                "updated_count": updates["successful"],
                "failed_count": updates["failed"],
                "updates": updates,
            }
        except Exception as e:
            logger.error(f"Error updating Bill.com: {e}")
            return {"status": "failed", "error": str(e), "updates": None}

    def _stage_generate_report(
        self, result: Dict[str, Any], report_type: str = "daily"
    ) -> Dict[str, Any]:
        logger.info(f"Stage: Generating {report_type} report")
        try:
            matches = result["stages"]["matching"].get("matches", [])
            invoices = result["stages"]["fetch_invoices"].get("invoices", [])
            report = (
                self.reporter.generate_daily_report(matches, invoices)
                if report_type == "daily"
                else self.reporter.generate_weekly_report(matches, invoices)
            )
            return {"status": "success", "report": report}
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            return {"status": "failed", "error": str(e), "report": None}

    def _stage_send_notifications(
        self, result: Dict[str, Any], report_type: str = "daily"
    ) -> Dict[str, Any]:
        logger.info("Stage: Sending notifications")
        try:
            report = result["stages"]["generate_report"].get("report")
            if not report:
                return {"status": "success", "notifications_sent": 0}

            sent = 0
            if self.slack.client:
                message = self.reporter.format_report_for_slack(report)
                if report_type == "daily":
                    self.notifier.send_daily_report(message)
                else:
                    self.notifier.send_weekly_report(message)
                sent += 1

                if report_type == "daily":
                    unmatched_candidates = result["stages"]["matching"].get(
                        "unmatched_candidates", []
                    )
                    if unmatched_candidates:
                        self.notifier.send_unmatched_alert(unmatched_candidates)
                        sent += 1

            if self.notion.client:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
                title = f"{report_type.capitalize()} AR Report - {timestamp}"
                self.notion.create_daily_report_page(title, report)
                sent += 1

            return {"status": "success", "notifications_sent": sent}
        except Exception as e:
            logger.error(f"Error sending notifications: {e}")
            return {"status": "failed", "error": str(e), "notifications_sent": 0}

    def _send_error_alert(self, result: Dict[str, Any]) -> None:
        try:
            if self.slack.client:
                errors = ", ".join(result.get("errors", []))
                self.notifier.send_error_alert(
                    error_message=errors,
                    context=result.get("workflow", "unknown"),
                )
        except Exception as e:
            logger.error(f"Error sending error alert: {e}")
