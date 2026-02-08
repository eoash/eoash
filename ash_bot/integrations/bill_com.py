"""Bill.com API integration."""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime
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


class BillComClient:
    """Bill.com API client."""

    def __init__(self):
        """Initialize Bill.com client."""
        self.api_key = BillComConfig.API_KEY
        self.org_id = BillComConfig.ORG_ID
        self.base_url = BillComConfig.BASE_URL

        if not self.api_key or not self.org_id:
            logger.warning("Bill.com credentials not fully configured")

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make API request to Bill.com."""
        url = f"{self.base_url}/{endpoint}"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=params)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"Bill.com API error: {str(e)}")
            raise

    def get_outstanding_invoices(self) -> List[Invoice]:
        """
        Fetch outstanding (unpaid) invoices from Bill.com.

        Returns:
            List of Invoice objects with status = "unpaid"
        """
        logger.info("Fetching outstanding invoices from Bill.com")

        try:
            # This is a placeholder API call structure
            # Actual endpoint and response structure depends on Bill.com API docs
            response = self._make_request(
                "GET",
                "invoices",
                params={
                    "status": "unpaid",
                    "orgId": self.org_id,
                }
            )

            invoices = []
            if "data" in response:
                for item in response["data"]:
                    invoice = Invoice(
                        id=item.get("id"),
                        invoice_number=item.get("invoiceNumber"),
                        amount=float(item.get("amount", 0)),
                        customer_name=item.get("customerName", ""),
                        customer_email=item.get("customerEmail"),
                        due_date=item.get("dueDate"),
                        status=item.get("status", "unpaid"),
                        created_date=item.get("createdDate"),
                        paid_date=item.get("paidDate"),
                        notes=item.get("notes"),
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
                "id": invoice_id,
                "status": status,
                "paidDate": paid_date,
                "orgId": self.org_id,
            }

            response = self._make_request("PUT", f"invoices/{invoice_id}", data=data)

            if response.get("success"):
                logger.info(f"Successfully updated invoice {invoice_id}")
                return True
            else:
                logger.error(f"Failed to update invoice: {response.get('error')}")
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
                "GET",
                f"invoices/{invoice_id}",
                params={"orgId": self.org_id}
            )

            if response.get("success"):
                item = response.get("data", {})
                invoice = Invoice(
                    id=item.get("id"),
                    invoice_number=item.get("invoiceNumber"),
                    amount=float(item.get("amount", 0)),
                    customer_name=item.get("customerName", ""),
                    customer_email=item.get("customerEmail"),
                    due_date=item.get("dueDate"),
                    status=item.get("status"),
                    created_date=item.get("createdDate"),
                    paid_date=item.get("paidDate"),
                    notes=item.get("notes"),
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
                "GET",
                "invoices",
                params={
                    "status": "paid",
                    "daysBack": days_back,
                    "orgId": self.org_id,
                }
            )

            invoices = []
            if "data" in response:
                for item in response["data"]:
                    invoice = Invoice(
                        id=item.get("id"),
                        invoice_number=item.get("invoiceNumber"),
                        amount=float(item.get("amount", 0)),
                        customer_name=item.get("customerName", ""),
                        customer_email=item.get("customerEmail"),
                        due_date=item.get("dueDate"),
                        status="paid",
                        created_date=item.get("createdDate"),
                        paid_date=item.get("paidDate"),
                        notes=item.get("notes"),
                    )
                    invoices.append(invoice)

            return invoices

        except Exception as e:
            logger.error(f"Error fetching paid invoices: {str(e)}")
            return []
