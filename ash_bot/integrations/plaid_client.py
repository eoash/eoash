"""Plaid API integration for Chase Bank connection."""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from plaid import ApiClient, Configuration
from plaid.api import plaid_api
from plaid.model.transactions_get_request import TransactionsGetRequest
from ash_bot.config import PlaidConfig
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
    payment_channel: str  # "online", "in store", "other"

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


class PlaidClient:
    """Plaid API client for bank transaction integration."""

    def __init__(self):
        """Initialize Plaid client."""
        self.client_id = PlaidConfig.CLIENT_ID
        self.secret = PlaidConfig.SECRET
        self.env = PlaidConfig.ENV
        self.access_token = PlaidConfig.ACCESS_TOKEN

        if not self.client_id or not self.secret:
            logger.warning("Plaid credentials not fully configured")

        # Initialize Plaid API client if credentials available
        if self.client_id and self.secret:
            config = Configuration(
                host=self._get_plaid_env(),
                api_key={
                    "clientId": self.client_id,
                    "secret": self.secret,
                }
            )
            self.api_client = ApiClient(config)
            self.client = plaid_api.PlaidApi(self.api_client)
        else:
            self.api_client = None
            self.client = None

    def _get_plaid_env(self) -> str:
        """Get Plaid environment URL."""
        environments = {
            "sandbox": "https://sandbox.plaid.com",
            "development": "https://development.plaid.com",
            "production": "https://production.plaid.com",
        }
        return environments.get(self.env, "https://sandbox.plaid.com")

    def get_recent_transactions(
        self,
        days: int = 7,
        account_id: Optional[str] = None
    ) -> List[Transaction]:
        """
        Fetch recent transactions from connected Chase account.

        Args:
            days: Look back this many days
            account_id: Specific account ID (optional)

        Returns:
            List of Transaction objects
        """
        if not self.access_token or not self.client:
            logger.error("Plaid access token not configured")
            return []

        logger.info(f"Fetching transactions from last {days} days")

        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)

            request = TransactionsGetRequest(
                client_id=self.client_id,
                secret=self.secret,
                access_token=self.access_token,
                start_date=start_date,
                end_date=end_date,
            )

            response = self.client.transactions_get(request)

            transactions = []
            for txn in response["transactions"]:
                transaction = Transaction(
                    id=txn.get("transaction_id"),
                    account_id=txn.get("account_id"),
                    date=str(txn.get("date")),
                    amount=float(txn.get("amount", 0)),
                    description=txn.get("name", ""),
                    merchant_name=txn.get("merchant_name"),
                    category=txn.get("personal_finance_category", {}).get("primary", []),
                    pending=txn.get("pending", False),
                    payment_channel=txn.get("payment_channel", "other"),
                )
                transactions.append(transaction)

            logger.info(f"Found {len(transactions)} transactions")
            return transactions

        except Exception as e:
            logger.error(f"Error fetching transactions: {str(e)}")
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
            # Positive amounts are typically deposits/income
            # Exclude pending transactions
            if txn.amount > min_amount and not txn.pending:
                # Filter by payment channel and categories
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
        desc_lower = transaction.description.lower()

        for keyword in refund_keywords:
            if keyword in desc_lower:
                return False

        return True

    def connect_account(self) -> Optional[str]:
        """
        Initiate account connection flow (returns link token).
        User must complete OAuth flow separately.

        Returns:
            Link token for user to complete OAuth
        """
        if not self.client:
            logger.error("Plaid client not configured")
            return None

        try:
            from plaid.model.link_token_create_request import LinkTokenCreateRequest
            from plaid.model.country_code import CountryCode
            from plaid.model.products import Products

            request = LinkTokenCreateRequest(
                user={"client_user_id": "user-id"},
                client_name="EO Studio AR System",
                products=[Products("auth")],
                country_codes=[CountryCode("US")],
                language="en",
            )

            response = self.client.link_token_create(request)
            link_token = response["link_token"]

            logger.info("Created Plaid link token for account connection")
            return link_token

        except Exception as e:
            logger.error(f"Error creating link token: {str(e)}")
            return None

    def exchange_token(self, public_token: str) -> Optional[str]:
        """
        Exchange public token for access token after OAuth completion.

        Args:
            public_token: Public token from Plaid Link OAuth

        Returns:
            Access token for future API calls
        """
        if not self.client:
            logger.error("Plaid client not configured")
            return None

        try:
            from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest

            request = ItemPublicTokenExchangeRequest(
                public_token=public_token,
            )

            response = self.client.item_public_token_exchange(request)
            access_token = response["access_token"]

            logger.info("Successfully exchanged public token for access token")
            return access_token

        except Exception as e:
            logger.error(f"Error exchanging token: {str(e)}")
            return None
