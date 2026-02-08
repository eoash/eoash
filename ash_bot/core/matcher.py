"""Payment-to-invoice matching logic."""

from typing import List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
from ash_bot.integrations.bill_com import Invoice
from ash_bot.integrations.plaid_client import Transaction
from ash_bot.config import ARConfig
from ash_bot.utils.logger import get_logger
from ash_bot.utils.validators import (
    amounts_match,
    fuzzy_match_similarity,
    extract_invoice_number
)

logger = get_logger(__name__)


@dataclass
class MatchResult:
    """Result of payment-to-invoice matching."""
    payment: Transaction
    invoice: Invoice
    confidence: float  # 0.0 to 1.0
    match_type: str  # "exact", "fuzzy", "number_extraction"
    amount_diff: float  # Difference in amount if any


class PaymentMatcher:
    """Match bank transactions to unpaid invoices."""

    def __init__(self, tolerance: float = ARConfig.AMOUNT_TOLERANCE):
        """
        Initialize payment matcher.

        Args:
            tolerance: Amount matching tolerance in dollars
        """
        self.tolerance = tolerance

    def match_payment_to_invoice(
        self,
        payment: Transaction,
        invoices: List[Invoice]
    ) -> Optional[MatchResult]:
        """
        Match a single payment to an invoice.

        Matching logic:
        1. Try exact amount match
        2. Try amount match with invoice number extraction
        3. Try fuzzy matching on customer name

        Args:
            payment: Bank transaction
            invoices: List of outstanding invoices

        Returns:
            MatchResult if matched, None otherwise
        """
        # Preliminary checks
        if payment.amount <= 0:
            logger.debug(f"Skipping payment with non-positive amount: {payment.amount}")
            return None

        # Filter invoices by amount first
        amount_candidates = self._get_amount_candidates(payment.amount, invoices)

        if not amount_candidates:
            logger.debug(f"No invoices match amount {payment.amount}")
            return None

        # Try different matching strategies
        result = self._try_exact_match(payment, amount_candidates)
        if result:
            return result

        result = self._try_number_extraction_match(payment, amount_candidates)
        if result:
            return result

        result = self._try_fuzzy_match(payment, amount_candidates)
        if result and result.confidence > 0.7:  # High confidence threshold
            return result

        return None

    def match_payments_to_invoices(
        self,
        payments: List[Transaction],
        invoices: List[Invoice]
    ) -> Tuple[List[MatchResult], List[Transaction]]:
        """
        Match multiple payments to invoices.

        Args:
            payments: List of bank transactions
            invoices: List of outstanding invoices

        Returns:
            Tuple of (matches, unmatched_payments)
        """
        logger.info(f"Matching {len(payments)} payments to {len(invoices)} invoices")

        matches = []
        matched_invoice_ids = set()
        unmatched = []

        # Sort invoices by amount for more efficient matching
        sorted_invoices = sorted(invoices, key=lambda x: x.amount)

        for payment in payments:
            # Get invoices not yet matched
            available_invoices = [
                inv for inv in sorted_invoices
                if inv.id not in matched_invoice_ids
            ]

            result = self.match_payment_to_invoice(payment, available_invoices)

            if result:
                matches.append(result)
                matched_invoice_ids.add(result.invoice.id)
                logger.info(
                    f"Matched payment ${payment.amount} ({payment.date}) "
                    f"to invoice {result.invoice.invoice_number} "
                    f"(confidence: {result.confidence:.2%})"
                )
            else:
                unmatched.append(payment)
                logger.debug(f"Could not match payment ${payment.amount} ({payment.date})")

        logger.info(f"Successfully matched {len(matches)} payments, {len(unmatched)} unmatched")
        return matches, unmatched

    def _get_amount_candidates(
        self,
        amount: float,
        invoices: List[Invoice]
    ) -> List[Invoice]:
        """Get invoices with matching amounts (within tolerance)."""
        candidates = []
        for invoice in invoices:
            if amounts_match(amount, invoice.amount, self.tolerance):
                candidates.append(invoice)
        return candidates

    def _try_exact_match(
        self,
        payment: Transaction,
        invoices: List[Invoice]
    ) -> Optional[MatchResult]:
        """
        Try to match by exact amount and basic checks.
        Returns first exact match found.
        """
        for invoice in invoices:
            # Check amount matches
            if not amounts_match(payment.amount, invoice.amount, self.tolerance):
                continue

            # Check payment date is after or equal to invoice date
            if payment.date < invoice.created_date:
                continue

            # Exact match found
            return MatchResult(
                payment=payment,
                invoice=invoice,
                confidence=1.0,
                match_type="exact",
                amount_diff=0.0
            )

        return None

    def _try_number_extraction_match(
        self,
        payment: Transaction,
        invoices: List[Invoice]
    ) -> Optional[MatchResult]:
        """
        Try to match by extracting invoice number from payment description.
        """
        invoice_number = extract_invoice_number(payment.description)

        if not invoice_number:
            return None

        for invoice in invoices:
            if invoice.invoice_number == invoice_number:
                # Verify amount is close
                if amounts_match(payment.amount, invoice.amount, self.tolerance * 10):
                    return MatchResult(
                        payment=payment,
                        invoice=invoice,
                        confidence=0.95,
                        match_type="number_extraction",
                        amount_diff=abs(float(payment.amount) - float(invoice.amount))
                    )

        return None

    def _try_fuzzy_match(
        self,
        payment: Transaction,
        invoices: List[Invoice]
    ) -> Optional[MatchResult]:
        """
        Try to match by fuzzy matching customer name.
        """
        best_match = None
        best_confidence = 0.0

        # Try matching against merchant name in payment
        merchant = payment.merchant_name or payment.description

        for invoice in invoices:
            # Calculate name similarity
            similarity = fuzzy_match_similarity(
                merchant,
                invoice.customer_name
            )

            if similarity > best_confidence:
                best_confidence = similarity
                best_match = invoice

        if best_match and best_confidence > 0.5:
            return MatchResult(
                payment=payment,
                invoice=best_match,
                confidence=best_confidence,
                match_type="fuzzy",
                amount_diff=abs(float(payment.amount) - float(best_match.amount))
            )

        return None

    def get_match_summary(self, matches: List[MatchResult]) -> dict:
        """
        Generate summary statistics from matches.

        Returns:
            Dictionary with summary data
        """
        total_matched = sum(m.payment.amount for m in matches)
        by_confidence = {
            "high": sum(1 for m in matches if m.confidence >= 0.95),
            "medium": sum(1 for m in matches if 0.7 <= m.confidence < 0.95),
            "low": sum(1 for m in matches if m.confidence < 0.7),
        }
        by_type = {}
        for match in matches:
            by_type[match.match_type] = by_type.get(match.match_type, 0) + 1

        return {
            "total_matches": len(matches),
            "total_amount": total_matched,
            "by_confidence": by_confidence,
            "by_type": by_type,
            "average_confidence": sum(m.confidence for m in matches) / len(matches) if matches else 0
        }
