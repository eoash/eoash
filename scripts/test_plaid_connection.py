#!/usr/bin/env python3
"""Test Plaid API connection."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ash_bot.integrations.plaid_client import PlaidClient
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


def test_plaid_connection():
    """Test Plaid API connection."""
    print("=" * 60)
    print("Plaid API Connection Test")
    print("=" * 60)
    print()

    # Initialize client
    print("1. Initializing Plaid client...")
    try:
        client = PlaidClient()
        print("   ✅ Client initialized successfully")
        print(f"   - Client ID: {client.client_id[:10]}..." if client.client_id else "   - Client ID: Not set")
        print(f"   - Environment: {client.env}")
        print(f"   - Access Token: {'Set' if client.access_token else 'Not set'}")
        print()
    except Exception as e:
        print(f"   ❌ Error initializing client: {e}")
        return False

    # Test fetching recent transactions
    print("2. Testing API connection (fetching recent transactions)...")
    try:
        transactions = client.get_recent_transactions(days=7)
        print(f"   ✅ Successfully connected to Plaid API")
        print(f"   - Found {len(transactions)} transactions in last 7 days")
        print()

        if transactions:
            print("3. Sample transaction data:")
            for i, txn in enumerate(transactions[:3], 1):  # Show first 3
                print(f"   Transaction #{i}:")
                print(f"     - Date: {txn.date}")
                print(f"     - Amount: ${txn.amount:,.2f}")
                print(f"     - Description: {txn.description}")
                print(f"     - Merchant: {txn.merchant_name or 'N/A'}")
                print(f"     - Pending: {txn.pending}")
                print()

            # Test filtering incoming payments
            print("4. Testing payment filtering...")
            incoming = client.filter_incoming_payments(transactions, min_amount=100)
            print(f"   ✅ Found {len(incoming)} incoming payments (>$100)")

            if incoming:
                print("\n   Sample incoming payment:")
                payment = incoming[0]
                print(f"     - Date: {payment.date}")
                print(f"     - Amount: ${payment.amount:,.2f}")
                print(f"     - Description: {payment.description}")
                print()

        return True

    except Exception as e:
        print(f"   ❌ Error connecting to Plaid API:")
        print(f"      {str(e)}")
        print()
        print("   Possible issues:")
        print("   - Invalid CLIENT_ID or SECRET")
        print("   - Invalid or expired ACCESS_TOKEN")
        print("   - Network connection issue")
        print("   - Plaid API service issue")
        return False


if __name__ == "__main__":
    print()
    success = test_plaid_connection()
    print("=" * 60)
    if success:
        print("✅ Plaid API test completed successfully!")
    else:
        print("❌ Plaid API test failed. Please check your credentials.")
    print("=" * 60)
    print()

    sys.exit(0 if success else 1)
