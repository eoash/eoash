"""QuickBooks API integration for bank transactions and payments."""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
import requests
import base64
from ash_bot.config import QuickBooksConfig
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class Transaction:
    """Bank transaction data structure."""
    id: str
    account_id: str
    date: str
    amount: float
    description: str
    merchant_name: Optional[str]
    category: List[str]
    pending: bool
    payment_channel: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "account_id": self.account_id,
            "date": self.date,
            "amount": self.amount,
            "description": self.description,
            "merchant_name": self.merchant_name,
            "category": self.category,
            "pending": self.pending,
            "payment_channel": self.payment_channel,
        }


@dataclass
class Payment:
    """QuickBooks payment data structure."""
    id: str
    payment_date: str
    amount: float
    customer_name: str
    payment_method: Optional[str]
    reference_number: Optional[str]
    description: Optional[str]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "payment_date": self.payment_date,
            "amount": self.amount,
            "customer_name": self.customer_name,
            "payment_method": self.payment_method,
            "reference_number": self.reference_number,
            "description": self.description,
        }


class QuickBooksClient:
    """QuickBooks API client for bank transactions and payment integration."""

    def __init__(self):
        """Initialize QuickBooks client."""
        self.client_id = QuickBooksConfig.CLIENT_ID
        self.client_secret = QuickBooksConfig.CLIENT_SECRET
        self.realm_id = QuickBooksConfig.REALM_ID
        self.refresh_token = QuickBooksConfig.REFRESH_TOKEN
        self.base_url = QuickBooksConfig.get_base_url()
        self.access_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None

        if not self.client_id or not self.client_secret:
            logger.warning("QuickBooks credentials not fully configured")

    def _get_access_token(self) -> str:
        """
        Get access token using refresh token.

        Returns:
            Valid access token
        """
        # Check if current token is still valid
        if self.access_token and self.token_expiry:
            if datetime.now() < self.token_expiry:
                return self.access_token

        logger.info("Refreshing QuickBooks access token...")

        # Create Basic Auth header
        auth_string = f"{self.client_id}:{self.client_secret}"
        auth_bytes = auth_string.encode('ascii')
        auth_b64 = base64.b64encode(auth_bytes).decode('ascii')

        headers = {
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/x-www-form-urlencoded",
        }

        data = {
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token,
        }

        try:
            response = requests.post(
                QuickBooksConfig.AUTH_URL,
                headers=headers,
                data=data
            )
            response.raise_for_status()

            result = response.json()
            self.access_token = result.get("access_token")
            expires_in = result.get("expires_in", 3600)  # Default 1 hour
            self.token_expiry = datetime.now() + timedelta(seconds=expires_in - 60)  # 60s buffer

            # Update refresh token if new one provided
            new_refresh_token = result.get("refresh_token")
            if new_refresh_token:
                self.refresh_token = new_refresh_token
                logger.info("Refresh token updated")

            logger.info("Access token refreshed successfully")
            return self.access_token

        except requests.exceptions.RequestException as e:
            logger.error(f"Error refreshing access token: {str(e)}")
            raise Exception("Failed to refresh QuickBooks access token")

    def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make API request to QuickBooks."""
        access_token = self._get_access_token()

        url = f"{self.base_url}/v3/company/{self.realm_id}/{endpoint}"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=params)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"QuickBooks API error: {str(e)}")
            if hasattr(e.response, 'text'):
                logger.error(f"Response: {e.response.text}")
            raise

    def get_recent_transactions(
        self,
        days: int = 7,
        account_id: Optional[str] = None
    ) -> List[Transaction]:
        """
        Fetch recent bank transactions from QuickBooks.

        Args:
            days: Look back this many days
            account_id: Specific account ID (optional)

        Returns:
            List of Transaction objects
        """
        logger.info(f"Fetching bank transactions from last {days} days")

        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)

            # Query bank transactions
            query = f"SELECT * FROM Purchase WHERE TxnDate >= '{start_date}' AND TxnDate <= '{end_date}' MAXRESULTS 1000"

            response = self._make_request(
                "GET",
                "query",
                params={"query": query}
            )

            transactions = []
            query_response = response.get("QueryResponse", {})
            purchases = query_response.get("Purchase", [])

            for txn in purchases:
                # Extract transaction details
                transaction = Transaction(
                    id=txn.get("Id"),
                    account_id=txn.get("AccountRef", {}).get("value", ""),
                    date=txn.get("TxnDate"),
                    amount=float(txn.get("TotalAmt", 0)),
                    description=txn.get("PrivateNote", ""),
                    merchant_name=txn.get("EntityRef", {}).get("name"),
                    category=[txn.get("AccountRef", {}).get("name", "")],
                    pending=False,  # QuickBooks doesn't have pending status
                    payment_channel=txn.get("PaymentType", "other"),
                )
                transactions.append(transaction)

            logger.info(f"Found {len(transactions)} transactions")
            return transactions

        except Exception as e:
            logger.error(f"Error fetching transactions: {str(e)}")
            return []

    def get_recent_payments(self, days: int = 7) -> List[Payment]:
        """
        Fetch recent customer payments from QuickBooks.

        Args:
            days: Look back this many days

        Returns:
            List of Payment objects
        """
        logger.info(f"Fetching payments from last {days} days")

        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)

            # Query payments
            query = f"SELECT * FROM Payment WHERE TxnDate >= '{start_date}' AND TxnDate <= '{end_date}' MAXRESULTS 1000"

            response = self._make_request(
                "GET",
                "query",
                params={"query": query}
            )

            payments = []
            query_response = response.get("QueryResponse", {})
            payment_list = query_response.get("Payment", [])

            for pmt in payment_list:
                payment = Payment(
                    id=pmt.get("Id"),
                    payment_date=pmt.get("TxnDate"),
                    amount=float(pmt.get("TotalAmt", 0)),
                    customer_name=pmt.get("CustomerRef", {}).get("name", ""),
                    payment_method=pmt.get("PaymentMethodRef", {}).get("name"),
                    reference_number=pmt.get("PaymentRefNum"),
                    description=pmt.get("PrivateNote"),
                )
                payments.append(payment)

            logger.info(f"Found {len(payments)} payments")
            return payments

        except Exception as e:
            logger.error(f"Error fetching payments: {str(e)}")
            return []

    def filter_incoming_payments(
        self,
        transactions: List[Transaction],
        min_amount: float = 0
    ) -> List[Transaction]:
        """
        Filter transactions to only include incoming payments (deposits).

        Args:
            transactions: List of transactions to filter
            min_amount: Minimum transaction amount to include

        Returns:
            List of incoming payment transactions
        """
        incoming = []

        for txn in transactions:
            # Negative amounts in QuickBooks typically represent income/deposits
            if abs(txn.amount) >= min_amount and not txn.pending:
                if self._is_likely_payment(txn):
                    incoming.append(txn)

        logger.info(f"Filtered to {len(incoming)} incoming payments")
        return incoming

    def _is_likely_payment(self, transaction: Transaction) -> bool:
        """
        Determine if transaction is likely a payment (not refund/reversal).

        Args:
            transaction: Transaction to evaluate

        Returns:
            True if likely a payment
        """
        # Exclude known refund/reversal patterns
        refund_keywords = ["refund", "reversal", "return", "chargeback"]
        desc_lower = transaction.description.lower() if transaction.description else ""

        for keyword in refund_keywords:
            if keyword in desc_lower:
                return False

        return True

    def test_connection(self) -> bool:
        """
        Test QuickBooks API connection.

        Returns:
            True if connection successful
        """
        try:
            logger.info("Testing QuickBooks API connection...")

            # Simple query to test connection
            query = "SELECT * FROM CompanyInfo"
            response = self._make_request(
                "GET",
                "query",
                params={"query": query}
            )

            company_info = response.get("QueryResponse", {}).get("CompanyInfo", [])
            if company_info:
                company_name = company_info[0].get("CompanyName", "Unknown")
                logger.info(f"Successfully connected to QuickBooks: {company_name}")
                return True

            return False

        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}")
            return False
