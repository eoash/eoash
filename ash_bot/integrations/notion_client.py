"""Notion API integration for dashboard updates."""

from typing import Optional, Dict, Any, List
from datetime import datetime
from notion_client import Client
from ash_bot.config import NotionConfig
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


class NotionClient:
    """Notion API client for AR dashboard updates."""

    def __init__(self):
        """Initialize Notion client."""
        self.token = NotionConfig.TOKEN
        self.ar_database_id = NotionConfig.AR_DATABASE_ID

        if self.token:
            self.client = Client(auth=self.token)
        else:
            logger.warning("Notion token not configured")
            self.client = None

    def create_daily_report_page(
        self,
        title: str,
        report_data: Dict[str, Any]
    ) -> Optional[str]:
        """
        Create daily AR report page in Notion.

        Args:
            title: Page title
            report_data: Report content and metrics

        Returns:
            Page ID if successful, None otherwise
        """
        if not self.client:
            logger.error("Notion client not configured")
            return None

        try:
            # Convert report data to Notion blocks
            children = self._build_report_blocks(report_data)

            # Create page under AR database
            page = self.client.pages.create(
                parent={"database_id": self.ar_database_id},
                properties={
                    "title": {
                        "title": [
                            {
                                "text": {
                                    "content": title
                                }
                            }
                        ]
                    },
                    "Date": {
                        "date": {
                            "start": datetime.now().isoformat()
                        }
                    }
                },
                children=children if children else None
            )

            logger.info(f"Created Notion page: {page['id']}")
            return page['id']

        except Exception as e:
            logger.error(f"Error creating Notion page: {str(e)}")
            return None

    def update_ar_dashboard(self, data: Dict[str, Any]) -> bool:
        """
        Update AR dashboard page with latest data.

        Args:
            data: AR metrics and status

        Returns:
            True if successful, False otherwise
        """
        if not self.client or not self.ar_database_id:
            logger.error("Notion client or database ID not configured")
            return False

        try:
            # Query existing dashboard
            response = self.client.databases.query(
                database_id=self.ar_database_id,
                filter={
                    "property": "Type",
                    "select": {
                        "equals": "Dashboard"
                    }
                }
            )

            if response["results"]:
                # Update existing dashboard
                page_id = response["results"][0]["id"]
                self._update_dashboard_blocks(page_id, data)
                logger.info("Updated AR dashboard")
                return True
            else:
                # Create new dashboard if doesn't exist
                self.create_daily_report_page(
                    "AR Dashboard - Daily",
                    data
                )
                return True

        except Exception as e:
            logger.error(f"Error updating Notion dashboard: {str(e)}")
            return False

    def _build_report_blocks(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Build Notion blocks from report data.

        Args:
            data: Report data

        Returns:
            List of Notion block objects
        """
        blocks = []

        # Header
        blocks.append({
            "object": "block",
            "type": "heading_1",
            "heading_1": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {
                            "content": data.get("title", "AR Report")
                        }
                    }
                ]
            }
        })

        # Summary section
        if "summary" in data:
            blocks.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": "Summary"
                            }
                        }
                    ]
                }
            })

            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": data["summary"]
                            }
                        }
                    ]
                }
            })

        # Payments section
        if "new_payments" in data:
            blocks.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": "New Payments Received"
                            }
                        }
                    ]
                }
            })

            for payment in data["new_payments"]:
                blocks.append({
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": payment
                                }
                            }
                        ]
                    }
                })

        # Outstanding section
        if "outstanding" in data:
            blocks.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": "Outstanding AR"
                            }
                        }
                    ]
                }
            })

            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": data["outstanding"]
                            }
                        }
                    ]
                }
            })

        return blocks

    def _update_dashboard_blocks(
        self,
        page_id: str,
        data: Dict[str, Any]
    ) -> bool:
        """
        Update existing page blocks.

        Args:
            page_id: Notion page ID
            data: Updated data

        Returns:
            True if successful
        """
        try:
            # Clear existing blocks
            self.client.blocks.delete(page_id)

            # Add new blocks
            new_blocks = self._build_report_blocks(data)
            for block in new_blocks:
                self.client.blocks.children.append(
                    block_id=page_id,
                    children=[block]
                )

            return True

        except Exception as e:
            logger.error(f"Error updating dashboard blocks: {str(e)}")
            return False

    def create_invoice_record(
        self,
        invoice_id: str,
        invoice_number: str,
        amount: float,
        customer: str,
        status: str,
        due_date: str
    ) -> Optional[str]:
        """
        Create invoice record in Notion database.

        Args:
            invoice_id: Bill.com invoice ID
            invoice_number: Invoice number
            amount: Invoice amount
            customer: Customer name
            status: Current status
            due_date: Due date

        Returns:
            Page ID if successful, None otherwise
        """
        if not self.client or not self.ar_database_id:
            logger.error("Notion client not configured")
            return None

        try:
            page = self.client.pages.create(
                parent={"database_id": self.ar_database_id},
                properties={
                    "Invoice #": {
                        "title": [
                            {
                                "text": {
                                    "content": invoice_number
                                }
                            }
                        ]
                    },
                    "Amount": {
                        "number": amount
                    },
                    "Customer": {
                        "rich_text": [
                            {
                                "text": {
                                    "content": customer
                                }
                            }
                        ]
                    },
                    "Status": {
                        "select": {
                            "name": status
                        }
                    },
                    "Due Date": {
                        "date": {
                            "start": due_date
                        }
                    }
                }
            )

            logger.info(f"Created invoice record in Notion: {page['id']}")
            return page['id']

        except Exception as e:
            logger.error(f"Error creating invoice record: {str(e)}")
            return None

    def test_connection(self) -> bool:
        """Test Notion connection."""
        if not self.client:
            logger.warning("Notion client not configured")
            return False

        try:
            response = self.client.databases.retrieve(self.ar_database_id)
            logger.info(f"Notion connection successful")
            return True
        except Exception as e:
            logger.error(f"Notion connection failed: {str(e)}")
            return False
