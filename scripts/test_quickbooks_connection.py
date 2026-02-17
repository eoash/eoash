#!/usr/bin/env python3
"""Test QuickBooks API connection."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ash_bot.integrations.quickbooks_client import QuickBooksClient
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


def test_quickbooks_connection():
    """Test QuickBooks API connection."""
    print("=" * 60)
    print("QuickBooks API Connection Test")
    print("=" * 60)
    print()

    # Initialize client
    print("1. Initializing QuickBooks client...")
    try:
        client = QuickBooksClient()
        print("   ✅ Client initialized successfully")
        print(f"   - Client ID: {client.client_id[:10]}..." if client.client_id else "   - Client ID: Not set")
        print(f"   - Realm ID: {client.realm_id}")
        print(f"   - Environment: {QuickBooksConfig.ENV}")
        print(f"   - Refresh Token: {'Set' if client.refresh_token else 'Not set'}")
        print()
    except Exception as e:
        print(f"   ❌ Error initializing client: {e}")
        return False

    # Test connection
    print("2. Testing API connection...")
    try:
        if client.test_connection():
            print("   ✅ Successfully connected to QuickBooks API")
            print()
        else:
            print("   ❌ Connection test returned False")
            return False
    except Exception as e:
        print(f"   ❌ Error connecting to QuickBooks API:")
        print(f"      {str(e)}")
        print()
        print("   Possible issues:")
        print("   - Invalid CLIENT_ID or CLIENT_SECRET")
        print("   - Invalid or expired REFRESH_TOKEN")
        print("   - Invalid REALM_ID")
        print("   - Network connection issue")
        return False

    # Test fetching payments
    print("3. Testing payment retrieval (last 30 days)...")
    try:
        payments = client.get_recent_payments(days=30)
        print(f"   ✅ Successfully fetched payments")
        print(f"   - Found {len(payments)} payments in last 30 days")
        print()

        if payments:
            print("4. Sample payment data:")
            for i, payment in enumerate(payments[:3], 1):  # Show first 3
                print(f"   Payment #{i}:")
                print(f"     - Date: {payment.payment_date}")
                print(f"     - Amount: ${payment.amount:,.2f}")
                print(f"     - Customer: {payment.customer_name}")
                print(f"     - Method: {payment.payment_method or 'N/A'}")
                print(f"     - Reference: {payment.reference_number or 'N/A'}")
                print()

        return True

    except Exception as e:
        print(f"   ❌ Error fetching payments:")
        print(f"      {str(e)}")
        print()
        return False


if __name__ == "__main__":
    # Import here to avoid circular import
    from ash_bot.config import QuickBooksConfig

    print()
    success = test_quickbooks_connection()
    print("=" * 60)
    if success:
        print("✅ QuickBooks API test completed successfully!")
    else:
        print("❌ QuickBooks API test failed. Please check your credentials.")
    print("=" * 60)
    print()

    sys.exit(0 if success else 1)
