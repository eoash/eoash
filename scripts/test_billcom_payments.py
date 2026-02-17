#!/usr/bin/env python3
"""Test Bill.com Received Payments API."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ash_bot.integrations.bill_com import BillComClient
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


def test_billcom_payments():
    """Test Bill.com Received Payments API."""
    print("=" * 60)
    print("Bill.com Received Payments Test")
    print("=" * 60)
    print()

    # Initialize client
    print("1. Initializing Bill.com client...")
    client = BillComClient()
    print("   ✅ Client initialized")
    print()

    # Test fetching paid invoices
    print("2. Fetching paid invoices...")
    try:
        paid_invoices = client.get_recently_paid_invoices(days_back=30)
        print(f"   ✅ Found {len(paid_invoices)} paid invoices")
        print()

        if paid_invoices:
            print("3. Sample paid invoice data:")
            for i, invoice in enumerate(paid_invoices[:5], 1):  # Show first 5
                print(f"   Invoice #{i}:")
                print(f"     - ID: {invoice.id}")
                print(f"     - Number: {invoice.invoice_number}")
                print(f"     - Amount: ${invoice.amount:,.2f}")
                print(f"     - Customer: {invoice.customer_name}")
                print(f"     - Due Date: {invoice.due_date}")
                print(f"     - Paid Date: {invoice.paid_date}")
                print(f"     - Status: {invoice.status}")
                print()
        else:
            print("   ℹ️  No paid invoices found")
            print()

        # Test fetching outstanding invoices for comparison
        print("4. Fetching outstanding invoices for comparison...")
        invoices = client.get_outstanding_invoices()
        print(f"   ✅ Found {len(invoices)} outstanding invoices")
        print()

        if invoices:
            print("   Sample outstanding invoice:")
            inv = invoices[0]
            print(f"     - ID: {inv.id}")
            print(f"     - Number: {inv.invoice_number}")
            print(f"     - Amount: ${inv.amount:,.2f}")
            print(f"     - Customer: {inv.customer_name}")
            print(f"     - Due Date: {inv.due_date}")
            print()

        return True

    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print()
    success = test_billcom_payments()
    print("=" * 60)
    if success:
        print("✅ Payment test completed successfully!")
    else:
        print("❌ Payment test failed.")
    print("=" * 60)
    print()

    sys.exit(0 if success else 1)
