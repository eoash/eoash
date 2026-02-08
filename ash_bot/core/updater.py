"""Bill.com invoice status updater."""

from typing import List, Dict, Any
from datetime import datetime
from ash_bot.integrations.bill_com import BillComClient, Invoice
from ash_bot.core.matcher import MatchResult
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


class InvoiceUpdater:
    """Handle invoice status updates in Bill.com."""

    def __init__(self, bill_com_client: BillComClient):
        """
        Initialize updater.

        Args:
            bill_com_client: Bill.com API client
        """
        self.client = bill_com_client

    def update_from_matches(
        self,
        matches: List[MatchResult],
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Update Bill.com invoices based on matched payments.

        Args:
            matches: List of matched payment-invoice pairs
            dry_run: If True, log updates without actually making them

        Returns:
            Update result summary
        """
        logger.info(f"Updating {len(matches)} invoices (dry_run={dry_run})")

        successful = []
        failed = []

        for match in matches:
            result = self.update_invoice(
                match.invoice,
                match.payment.date,
                dry_run=dry_run
            )

            if result["success"]:
                successful.append({
                    "invoice_id": match.invoice.id,
                    "invoice_number": match.invoice.invoice_number,
                    "amount": match.payment.amount,
                    "paid_date": match.payment.date
                })
            else:
                failed.append({
                    "invoice_id": match.invoice.id,
                    "invoice_number": match.invoice.invoice_number,
                    "error": result.get("error", "Unknown error")
                })

        summary = {
            "total": len(matches),
            "successful": len(successful),
            "failed": len(failed),
            "dry_run": dry_run,
            "successful_updates": successful,
            "failed_updates": failed
        }

        logger.info(
            f"Update summary: {len(successful)} successful, {len(failed)} failed"
        )

        return summary

    def update_invoice(
        self,
        invoice: Invoice,
        paid_date: str,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Update a single invoice to paid.

        Args:
            invoice: Invoice to update
            paid_date: Payment date (YYYY-MM-DD format)
            dry_run: If True, don't actually update

        Returns:
            Update result dictionary
        """
        logger.info(
            f"Updating invoice {invoice.invoice_number} to paid "
            f"(date: {paid_date}, dry_run={dry_run})"
        )

        if dry_run:
            logger.info(f"[DRY RUN] Would update invoice {invoice.id} to paid")
            return {"success": True, "dry_run": True}

        try:
            success = self.client.update_invoice_status(
                invoice.id,
                paid_date,
                status="paid"
            )

            if success:
                logger.info(f"Successfully updated invoice {invoice.id}")
                return {"success": True}
            else:
                return {
                    "success": False,
                    "error": "Bill.com API returned failure"
                }

        except Exception as e:
            logger.error(f"Error updating invoice {invoice.id}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def mark_duplicate_payment(
        self,
        invoice: Invoice,
        reason: str = "Duplicate payment detected"
    ) -> bool:
        """
        Mark invoice with a note about duplicate/suspicious payment.

        Args:
            invoice: Invoice to mark
            reason: Reason for marking

        Returns:
            True if successful
        """
        logger.warning(f"Marking invoice {invoice.id} with note: {reason}")

        # This would update invoice notes, actual implementation depends on
        # Bill.com API capabilities
        try:
            # Note: Bill.com API may not support updating notes directly
            # This is a placeholder for the functionality
            logger.info(f"Invoice {invoice.id} marked with: {reason}")
            return True
        except Exception as e:
            logger.error(f"Error marking invoice: {str(e)}")
            return False

    def create_reconciliation_report(
        self,
        updates: Dict[str, Any]
    ) -> str:
        """
        Create a reconciliation report of updates made.

        Args:
            updates: Update summary from update_from_matches()

        Returns:
            Formatted report string
        """
        lines = []

        lines.append("=" * 60)
        lines.append("INVOICE UPDATE RECONCILIATION REPORT")
        lines.append("=" * 60)
        lines.append("")

        lines.append(f"Timestamp: {datetime.now().isoformat()}")
        lines.append(f"Dry Run: {updates['dry_run']}")
        lines.append("")

        lines.append(f"Total Processed: {updates['total']}")
        lines.append(f"Successful: {updates['successful']}")
        lines.append(f"Failed: {updates['failed']}")
        lines.append("")

        if updates["successful_updates"]:
            lines.append("SUCCESSFUL UPDATES:")
            lines.append("-" * 60)
            for update in updates["successful_updates"]:
                lines.append(
                    f"  Invoice {update['invoice_number']}: "
                    f"${update['amount']:,.2f} - Paid {update['paid_date']}"
                )
            lines.append("")

        if updates["failed_updates"]:
            lines.append("FAILED UPDATES:")
            lines.append("-" * 60)
            for update in updates["failed_updates"]:
                lines.append(
                    f"  Invoice {update['invoice_number']}: "
                    f"ERROR - {update['error']}"
                )
            lines.append("")

        lines.append("=" * 60)

        return "\n".join(lines)
