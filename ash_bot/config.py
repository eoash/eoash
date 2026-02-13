"""Configuration management for AR automation system."""

import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

# Project directories
PROJECT_ROOT = Path(__file__).parent.parent
AGENT_DIR = PROJECT_ROOT / "agent"
LOGS_DIR = PROJECT_ROOT / "logs"
REPORTS_DIR = AGENT_DIR / "reports"

# Ensure directories exist
LOGS_DIR.mkdir(exist_ok=True)
REPORTS_DIR.mkdir(exist_ok=True)

# API Configuration
class BillComConfig:
    """Bill.com API configuration."""
    API_KEY = os.getenv("BILL_COM_API_KEY")  # Developer Key
    ORG_ID = os.getenv("BILL_COM_ORG_ID")
    USERNAME = os.getenv("BILL_COM_USERNAME")  # Login email
    PASSWORD = os.getenv("BILL_COM_PASSWORD")  # Login password
    BASE_URL = "https://api.bill.com/api/v2"  # Production v2 API

    @staticmethod
    def validate():
        """Validate Bill.com configuration."""
        if not BillComConfig.API_KEY or not BillComConfig.ORG_ID:
            raise ValueError("Bill.com API credentials not configured")
        if not BillComConfig.USERNAME or not BillComConfig.PASSWORD:
            raise ValueError("Bill.com login credentials not configured")


class PlaidConfig:
    """Plaid API configuration."""
    CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
    SECRET = os.getenv("PLAID_SECRET")
    ENV = os.getenv("PLAID_ENV", "sandbox")
    ACCESS_TOKEN = os.getenv("PLAID_ACCESS_TOKEN")

    @staticmethod
    def validate():
        """Validate Plaid configuration."""
        if not PlaidConfig.CLIENT_ID or not PlaidConfig.SECRET:
            raise ValueError("Plaid credentials not configured")


class SlackConfig:
    """Slack API configuration."""
    BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
    CHANNEL_DAILY = os.getenv("SLACK_CHANNEL_DAILY", "finance-ar-daily")
    CHANNEL_ALERTS = os.getenv("SLACK_CHANNEL_ALERTS", "finance-ar-alerts")

    @staticmethod
    def validate():
        """Validate Slack configuration."""
        if not SlackConfig.BOT_TOKEN:
            raise ValueError("Slack BOT_TOKEN not configured")


class NotionConfig:
    """Notion API configuration."""
    TOKEN = os.getenv("NOTION_TOKEN")
    AR_DATABASE_ID = os.getenv("NOTION_AR_DATABASE_ID")

    @staticmethod
    def validate():
        """Validate Notion configuration."""
        if not NotionConfig.TOKEN or not NotionConfig.AR_DATABASE_ID:
            raise ValueError("Notion credentials not configured")


class LoggingConfig:
    """Logging configuration."""
    LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_DIR = LOGS_DIR

    @staticmethod
    def get_log_file(name: str) -> str:
        """Get path to log file."""
        return str(LOGS_DIR / f"{name}.log")


class ClaudeConfig:
    """Claude API configuration for AI-powered features."""
    API_KEY = os.getenv("ANTHROPIC_API_KEY")
    MODEL = "claude-opus-4-6"
    MAX_TOKENS = 4096

    @staticmethod
    def validate():
        """Validate Claude API configuration."""
        if not ClaudeConfig.API_KEY:
            raise ValueError("Claude API key not configured")


class ARConfig:
    """AR matching and reporting configuration."""
    # Payment matching tolerance (cents)
    AMOUNT_TOLERANCE = 0.01

    # Days to look back for transactions
    TRANSACTION_LOOKBACK_DAYS = 7

    # Invoice aging buckets (days)
    AGING_BUCKETS = {
        "current": (0, 30),
        "31_60": (31, 60),
        "61_90": (61, 90),
        "90_plus": (91, float('inf'))
    }

    # Timezone for reports
    TIMEZONE = "America/Los_Angeles"


class ThumbnailConfig:
    """YouTube thumbnail caption generation configuration."""
    STYLE_GUIDE_PATH = AGENT_DIR / "memory" / "thumbnail_team_style_guide.md"
    CAPTION_COUNT = 18  # 생성할 캡션 개수
    MIN_CAPTION_LENGTH = 10
    MAX_CAPTION_LENGTH = 150
    NOTION_DATABASE_ID = os.getenv("NOTION_THUMBNAIL_DATABASE_ID", "")

    @staticmethod
    def load_style_guide() -> str:
        """Load team style guide from file."""
        try:
            with open(ThumbnailConfig.STYLE_GUIDE_PATH, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            return ""
