#!/usr/bin/env python3
"""Test Bill.com API connection."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ash_bot.integrations.bill_com import BillComClient
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


def test_billcom_connection():
    """Test Bill.com API connection."""
    print("=" * 60)
    print("Bill.com API Connection Test")
    print("=" * 60)
    print()

    # Initialize client
    print("1. Initializing Bill.com client...")
    try:
        client = BillComClient()
        print("   ✅ Client initialized successfully")
        print(f"   - API Key: {client.api_key[:10]}..." if client.api_key else "   - API Key: Not set")
        print(f"   - Org ID: {client.org_id}")
        print(f"   - Base URL: {client.base_url}")
        print()
    except Exception as e:
        print(f"   ❌ Error initializing client: {e}")
        return False

    # Test fetching outstanding invoices
    print("2. Testing API connection (fetching outstanding invoices)...")
    try:
        invoices = client.get_outstanding_invoices()
        print(f"   ✅ Successfully connected to Bill.com API")
        print(f"   - Found {len(invoices)} outstanding invoices")
        print()

        if invoices:
            print("3. Sample invoice data:")
            for i, invoice in enumerate(invoices[:3], 1):  # Show first 3
                print(f"   Invoice #{i}:")
                print(f"     - Number: {invoice.invoice_number}")
                print(f"     - Amount: ${invoice.amount:,.2f}")
                print(f"     - Customer: {invoice.customer_name}")
                print(f"     - Due Date: {invoice.due_date}")
                print(f"     - Status: {invoice.status}")
                print()

        return True

    except Exception as e:
        print(f"   ❌ Error connecting to Bill.com API:")
        print(f"      {str(e)}")
        print()
        print("   Possible issues:")
        print("   - Invalid API key")
        print("   - Invalid Organization ID")
        print("   - Network connection issue")
        print("   - Bill.com API endpoint changed")
        return False


if __name__ == "__main__":
    print()
    success = test_billcom_connection()
    print("=" * 60)
    if success:
        print("✅ Bill.com API test completed successfully!")
    else:
        print("❌ Bill.com API test failed. Please check your credentials.")
    print("=" * 60)
    print()

    sys.exit(0 if success else 1)
