"""Bill.com API integration."""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime
import json
import requests
from ash_bot.config import BillComConfig
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class Invoice:
    """Invoice data structure."""
    id: str
    invoice_number: str
    amount: float
    customer_name: str
    customer_email: Optional[str]
    due_date: str
    status: str  # "unpaid", "paid", "draft"
    created_date: str
    paid_date: Optional[str] = None
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "amount": self.amount,
            "customer_name": self.customer_name,
            "customer_email": self.customer_email,
            "due_date": self.due_date,
            "status": self.status,
            "created_date": self.created_date,
            "paid_date": self.paid_date,
            "notes": self.notes,
        }


@dataclass
class Payment:
    """Payment data structure."""
    id: str
    payment_date: str
    amount: float
    customer_name: str
    payment_method: Optional[str]
    reference_number: Optional[str]
    description: Optional[str]
    invoice_ids: List[str]  # List of invoice IDs this payment applies to

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
            "invoice_ids": self.invoice_ids,
        }


class BillComClient:
    """Bill.com API client with session-based authentication."""

    def __init__(self):
        """Initialize Bill.com client."""
        self.api_key = BillComConfig.API_KEY  # Developer Key
        self.org_id = BillComConfig.ORG_ID
        self.username = BillComConfig.USERNAME
        self.password = BillComConfig.PASSWORD
        self.base_url = BillComConfig.BASE_URL
        self.session_id: Optional[str] = None

        if not self.api_key or not self.org_id:
            logger.warning("Bill.com credentials not fully configured")
        if not self.username or not self.password:
            logger.warning("Bill.com login credentials not configured")

    def login(self) -> bool:
        """
        Login to Bill.com and get session ID (v2 API).

        Returns:
            True if login successful, False otherwise
        """
        logger.info("Logging in to Bill.com...")

        url = f"{self.base_url}/Login.json"

        payload = {
            "userName": self.username,
            "password": self.password,
            "orgId": self.org_id,
            "devKey": self.api_key
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        try:
            # v2 API uses form data, not JSON
            response = requests.post(url, headers=headers, data=payload)
            response.raise_for_status()

            result = response.json()

            # Check response structure
            if result.get("response_status") == 0:
                response_data = result.get("response_data", {})
                self.session_id = response_data.get("sessionId")

                if self.session_id:
                    logger.info("Successfully logged in to Bill.com")
                    return True
                else:
                    logger.error("Login failed: No session ID returned")
                    return False
            else:
                error_msg = result.get("response_message", "Unknown error")
                logger.error(f"Login failed: {error_msg}")
                return False

        except requests.exceptions.RequestException as e:
            logger.error(f"Login error: {str(e)}")
            return False

    def _ensure_session(self):
        """Ensure we have a valid session, login if needed."""
        if not self.session_id:
            if not self.login():
                raise Exception("Failed to login to Bill.com")

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make API request to Bill.com v2 with session authentication."""
        self._ensure_session()

        url = f"{self.base_url}/{endpoint}"

        # v2 API requires data as JSON string in 'data' parameter
        form_data = {
            "sessionId": self.session_id,
            "devKey": self.api_key
        }

        if data:
            # Encode data dict as JSON string
            form_data["data"] = json.dumps(data)

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params={**params, **form_data} if params else form_data)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, data=form_data)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, data=form_data)
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            result = response.json()

            # v2 API response structure
            if result.get("response_status") == 0:
                return result.get("response_data", {})
            else:
                error_msg = result.get("response_message", "Unknown error")
                error_data = result.get("response_data", {})
                logger.error(f"API error: {error_msg}")
                logger.error(f"Error details: {error_data}")
                logger.debug(f"Full response: {result}")
                raise Exception(f"Bill.com API error: {error_msg}")

        except requests.exceptions.RequestException as e:
            logger.error(f"Bill.com API error: {str(e)}")
            raise

    def get_outstanding_invoices(self) -> List[Invoice]:
        """
        Fetch outstanding (unpaid) invoices from Bill.com.

        Returns:
            List of Invoice objects with amountDue > 0
        """
        logger.info("Fetching outstanding invoices from Bill.com")

        try:
            # Bill.com v2 API endpoint - returns list of invoices
            response = self._make_request(
                "POST",
                "List/Invoice.json",
                data={
                    "start": 0,
                    "max": 999,  # Max results per page
                }
            )

            invoices = []
            # Response is a list of invoice objects
            if isinstance(response, list):
                for item in response:
                    amount_due = float(item.get("amountDue", 0))

                    # Only include invoices with outstanding balance
                    if amount_due > 0:
                        invoice = Invoice(
                            id=item.get("id"),
                            invoice_number=item.get("invoiceNumber"),
                            amount=float(item.get("amount", 0)),
                            customer_name=item.get("organizationName", ""),  # v2 uses organizationName
                            customer_email=item.get("customerEmail"),
                            due_date=item.get("dueDate"),
                            status="unpaid" if amount_due > 0 else "paid",
                            created_date=item.get("invoiceDate"),  # v2 uses invoiceDate for creation
                            paid_date=None,  # Not in v2 response
                            notes=item.get("description"),
                        )
                        invoices.append(invoice)

            logger.info(f"Found {len(invoices)} outstanding invoices")
            return invoices

        except Exception as e:
            logger.error(f"Error fetching invoices: {str(e)}")
            return []

    def update_invoice_status(
        self,
        invoice_id: str,
        paid_date: str,
        status: str = "paid"
    ) -> bool:
        """
        Update invoice status to paid.

        Args:
            invoice_id: Bill.com invoice ID
            paid_date: Payment date (YYYY-MM-DD format)
            status: New status ("paid", "unpaid", etc.)

        Returns:
            True if successful, False otherwise
        """
        logger.info(f"Updating invoice {invoice_id} to {status}")

        try:
            data = {
                "obj": {
                    "entity": "Invoice",
                    "id": invoice_id,
                    "paymentStatus": "1" if status == "paid" else "4",
                }
            }

            response = self._make_request("POST", "Crud/Update/Invoice.json", data=data)

            if response:
                logger.info(f"Successfully updated invoice {invoice_id}")
                return True
            else:
                logger.error(f"Failed to update invoice {invoice_id}")
                return False

        except Exception as e:
            logger.error(f"Error updating invoice {invoice_id}: {str(e)}")
            return False

    def get_invoice_details(self, invoice_id: str) -> Optional[Invoice]:
        """
        Get detailed information about a specific invoice.

        Args:
            invoice_id: Bill.com invoice ID

        Returns:
            Invoice object or None if not found
        """
        try:
            response = self._make_request(
                "POST",
                "Crud/Read/Invoice.json",
                data={"id": invoice_id}
            )

            if response:
                item = response
                invoice = Invoice(
                    id=item.get("id"),
                    invoice_number=item.get("invoiceNumber"),
                    amount=float(item.get("amount", 0)),
                    customer_name=item.get("organizationName", ""),
                    customer_email=item.get("customerEmail"),
                    due_date=item.get("dueDate"),
                    status="paid" if float(item.get("amountDue", 0)) == 0 else "unpaid",
                    created_date=item.get("invoiceDate"),
                    paid_date=item.get("updatedTime", "")[:10] if float(item.get("amountDue", 0)) == 0 else None,
                    notes=item.get("description"),
                )
                return invoice
            return None

        except Exception as e:
            logger.error(f"Error fetching invoice {invoice_id}: {str(e)}")
            return None

    def get_paid_invoices(self, days_back: int = 7) -> List[Invoice]:
        """
        Fetch recently paid invoices.

        Args:
            days_back: Look back this many days

        Returns:
            List of paid invoices
        """
        logger.info(f"Fetching invoices paid in last {days_back} days")

        try:
            response = self._make_request(
                "POST",
                "List/Invoice.json",
                data={
                    "start": 0,
                    "max": 999,
                }
            )

            invoices = []
            if isinstance(response, list):
                for item in response:
                    amount_due = float(item.get("amountDue", 0))
                    total_amount = float(item.get("amount", 0))

                    # Only fully paid invoices with non-zero amount
                    if amount_due == 0 and total_amount > 0:
                        invoice = Invoice(
                            id=item.get("id"),
                            invoice_number=item.get("invoiceNumber"),
                            amount=total_amount,
                            customer_name=item.get("organizationName", ""),
                            customer_email=item.get("customerEmail"),
                            due_date=item.get("dueDate"),
                            status="paid",
                            created_date=item.get("invoiceDate"),
                            paid_date=item.get("updatedTime", "")[:10],
                            notes=item.get("description"),
                        )
                        invoices.append(invoice)

            return invoices

        except Exception as e:
            logger.error(f"Error fetching paid invoices: {str(e)}")
            return []

    def get_recently_paid_invoices(self, days_back: int = 7) -> List[Invoice]:
        """
        Fetch invoices that were recently paid (have amountDue == 0).

        Args:
            days_back: Look back this many days

        Returns:
            List of paid Invoice objects
        """
        logger.info(f"Fetching recently paid invoices from last {days_back} days")

        try:
            # Fetch all invoices and filter for paid ones
            response = self._make_request(
                "POST",
                "List/Invoice.json",
                data={
                    "start": 0,
                    "max": 999,
                }
            )

            paid_invoices = []
            # Response is a list of invoice objects
            if isinstance(response, list):
                for item in response:
                    amount_due = float(item.get("amountDue", 0))

                    # Only include invoices that are fully paid (amountDue == 0)
                    # and have a non-zero total amount
                    if amount_due == 0 and float(item.get("amount", 0)) > 0:
                        invoice = Invoice(
                            id=item.get("id"),
                            invoice_number=item.get("invoiceNumber"),
                            amount=float(item.get("amount", 0)),
                            customer_name=item.get("organizationName", ""),
                            customer_email=item.get("customerEmail"),
                            due_date=item.get("dueDate"),
                            status="paid",
                            created_date=item.get("invoiceDate"),
                            paid_date=item.get("updatedTime", "")[:10],  # Use updated time as proxy
                            notes=item.get("description"),
                        )
                        paid_invoices.append(invoice)

            logger.info(f"Found {len(paid_invoices)} paid invoices")
            return paid_invoices

        except Exception as e:
            logger.error(f"Error fetching paid invoices: {str(e)}")
            return []
