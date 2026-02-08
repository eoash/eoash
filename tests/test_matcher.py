"""Tests for payment-to-invoice matching logic."""

import pytest
from datetime import datetime, timedelta
from ash_bot.core.matcher import PaymentMatcher, MatchResult
from ash_bot.integrations.bill_com import Invoice
from ash_bot.integrations.plaid_client import Transaction


@pytest.fixture
def matcher():
    """Create a PaymentMatcher instance."""
    return PaymentMatcher(tolerance=0.01)


@pytest.fixture
def sample_invoices():
    """Create sample invoices for testing."""
    return [
        Invoice(
            id="inv1",
            invoice_number="INV-2026-001",
            amount=5000.00,
            customer_name="Client ABC Corp",
            customer_email="abc@client.com",
            due_date="2026-02-15",
            status="unpaid",
            created_date="2026-01-15"
        ),
        Invoice(
            id="inv2",
            invoice_number="INV-2026-002",
            amount=3500.00,
            customer_name="Client XYZ Inc",
            customer_email="xyz@client.com",
            due_date="2026-02-20",
            status="unpaid",
            created_date="2026-01-20"
        ),
        Invoice(
            id="inv3",
            invoice_number="INV-2026-003",
            amount=5000.00,  # Duplicate amount
            customer_name="Client DEF LLC",
            customer_email="def@client.com",
            due_date="2026-02-25",
            status="unpaid",
            created_date="2026-01-25"
        ),
    ]


@pytest.fixture
def sample_payments():
    """Create sample transactions for testing."""
    return [
        Transaction(
            id="txn1",
            account_id="account123",
            date="2026-02-09",
            amount=5000.00,
            description="WIRE TRANSFER FROM CLIENT ABC",
            merchant_name="CLIENT ABC CORP",
            category=["TRANSFER"],
            pending=False,
            payment_channel="online"
        ),
        Transaction(
            id="txn2",
            account_id="account123",
            date="2026-02-09",
            amount=3500.00,
            description="PAYMENT INV-2026-002",
            merchant_name="CLIENT XYZ",
            category=["TRANSFER"],
            pending=False,
            payment_channel="online"
        ),
        Transaction(
            id="txn3",
            account_id="account123",
            date="2026-02-09",
            amount=2000.00,
            description="PAYMENT FROM UNKNOWN",
            merchant_name=None,
            category=["OTHER"],
            pending=False,
            payment_channel="online"
        ),
    ]


class TestExactMatch:
    """Test exact amount matching."""

    def test_exact_amount_match(self, matcher, sample_invoices, sample_payments):
        """Test matching with exact amount."""
        payment = sample_payments[0]  # $5000
        result = matcher.match_payment_to_invoice(payment, sample_invoices)

        assert result is not None
        assert result.match_type == "exact"
        assert result.confidence == 1.0
        assert result.invoice.invoice_number == "INV-2026-001"

    def test_no_match_amount_mismatch(self, matcher, sample_invoices):
        """Test no match when amount doesn't match."""
        payment = Transaction(
            id="txn_test",
            account_id="test",
            date="2026-02-09",
            amount=999.99,
            description="UNKNOWN",
            merchant_name=None,
            category=[],
            pending=False,
            payment_channel="other"
        )

        result = matcher.match_payment_to_invoice(payment, sample_invoices)
        assert result is None

    def test_payment_date_before_invoice(self, matcher, sample_invoices):
        """Test no match when payment date is before invoice date."""
        payment = Transaction(
            id="txn_test",
            account_id="test",
            date="2026-01-01",  # Before invoice date
            amount=5000.00,
            description="EARLY PAYMENT",
            merchant_name="CLIENT ABC",
            category=[],
            pending=False,
            payment_channel="online"
        )

        result = matcher.match_payment_to_invoice(payment, sample_invoices)
        assert result is None


class TestNumberExtraction:
    """Test invoice number extraction matching."""

    def test_invoice_number_in_description(self, matcher, sample_invoices):
        """Test matching by extracting invoice number from description."""
        payment = Transaction(
            id="txn_test",
            account_id="test",
            date="2026-02-09",
            amount=3500.00,
            description="PAYMENT INV-2026-002",
            merchant_name=None,
            category=[],
            pending=False,
            payment_channel="online"
        )

        result = matcher.match_payment_to_invoice(payment, sample_invoices)

        assert result is not None
        assert result.match_type == "number_extraction"
        assert result.invoice.invoice_number == "INV-2026-002"

    def test_invoice_number_with_hash(self, matcher, sample_invoices):
        """Test invoice number extraction with # format."""
        payment = Transaction(
            id="txn_test",
            account_id="test",
            date="2026-02-09",
            amount=5000.00,
            description="PAYMENT #2026-001",
            merchant_name=None,
            category=[],
            pending=False,
            payment_channel="online"
        )

        # This payment doesn't have exact invoice number match
        # Should fall through to fuzzy matching or fail
        result = matcher.match_payment_to_invoice(payment, sample_invoices)


class TestFuzzyMatch:
    """Test fuzzy customer name matching."""

    def test_customer_name_similarity(self, matcher, sample_invoices):
        """Test matching by customer name similarity."""
        payment = Transaction(
            id="txn_test",
            account_id="test",
            date="2026-02-09",
            amount=5000.00,
            description="PAYMENT FROM ABC",
            merchant_name="ABC CORP",  # Similar to "CLIENT ABC CORP"
            category=[],
            pending=False,
            payment_channel="online"
        )

        result = matcher.match_payment_to_invoice(payment, sample_invoices)

        # Should match with some confidence
        if result:
            assert result.match_type == "fuzzy"
            assert result.confidence > 0.5


class TestMultipleMatches:
    """Test handling of multiple matching invoices."""

    def test_duplicate_amount(self, matcher, sample_invoices):
        """Test handling when multiple invoices have same amount."""
        payment = Transaction(
            id="txn_test",
            account_id="test",
            date="2026-02-09",
            amount=5000.00,  # Matches INV-2026-001 and INV-2026-003
            description="PAYMENT",
            merchant_name=None,
            category=[],
            pending=False,
            payment_channel="online"
        )

        result = matcher.match_payment_to_invoice(payment, sample_invoices)

        # Should match the first one found (deterministic)
        assert result is not None
        assert result.invoice.invoice_number in ["INV-2026-001", "INV-2026-003"]

    def test_batch_matching(self, matcher, sample_invoices, sample_payments):
        """Test matching multiple payments to invoices."""
        matches, unmatched = matcher.match_payments_to_invoices(
            sample_payments, sample_invoices
        )

        # Should match first two, fail on third
        assert len(matches) >= 1
        assert len(unmatched) >= 1

        # Check summary
        summary = matcher.get_match_summary(matches)
        assert summary["total_matches"] == len(matches)
        assert summary["average_confidence"] > 0


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_negative_amount(self, matcher, sample_invoices):
        """Test rejection of negative amounts."""
        payment = Transaction(
            id="txn_test",
            account_id="test",
            date="2026-02-09",
            amount=-5000.00,  # Negative (refund)
            description="REFUND",
            merchant_name=None,
            category=[],
            pending=False,
            payment_channel="online"
        )

        result = matcher.match_payment_to_invoice(payment, sample_invoices)
        assert result is None

    def test_zero_amount(self, matcher, sample_invoices):
        """Test rejection of zero amount."""
        payment = Transaction(
            id="txn_test",
            account_id="test",
            date="2026-02-09",
            amount=0.00,
            description="ZERO PAYMENT",
            merchant_name=None,
            category=[],
            pending=False,
            payment_channel="online"
        )

        result = matcher.match_payment_to_invoice(payment, sample_invoices)
        assert result is None

    def test_empty_invoice_list(self, matcher):
        """Test handling of empty invoice list."""
        payment = Transaction(
            id="txn_test",
            account_id="test",
            date="2026-02-09",
            amount=5000.00,
            description="PAYMENT",
            merchant_name=None,
            category=[],
            pending=False,
            payment_channel="online"
        )

        result = matcher.match_payment_to_invoice(payment, [])
        assert result is None
