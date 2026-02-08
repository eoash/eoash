"""Data validation utilities."""

from typing import Optional, Tuple
from decimal import Decimal
import re


def validate_amount(amount: float, tolerance: float = 0.01) -> bool:
    """Validate that amount is a positive number."""
    try:
        return float(amount) > 0
    except (TypeError, ValueError):
        return False


def amounts_match(amount1: float, amount2: float, tolerance: float = 0.01) -> bool:
    """Check if two amounts match within tolerance."""
    if not validate_amount(amount1) or not validate_amount(amount2):
        return False
    return abs(float(amount1) - float(amount2)) <= tolerance


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_date_string(date_str: str, format: str = "%Y-%m-%d") -> bool:
    """Validate date string format."""
    from datetime import datetime
    try:
        datetime.strptime(date_str, format)
        return True
    except ValueError:
        return False


def extract_invoice_number(text: str) -> Optional[str]:
    """Extract invoice number from text (patterns: INV-123, #123, etc)."""
    patterns = [
        r'INV-?(\d+)',
        r'#(\d+)',
        r'Invoice[:\s]+(\d+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def sanitize_string(text: str) -> str:
    """Sanitize string for safe output."""
    if not isinstance(text, str):
        return str(text)
    return text.strip()[:500]  # Limit length


def fuzzy_match_similarity(str1: str, str2: str) -> float:
    """
    Calculate similarity between two strings (0.0 to 1.0).
    Simple implementation based on character overlap.
    """
    if not str1 or not str2:
        return 0.0

    str1 = str1.lower().strip()
    str2 = str2.lower().strip()

    if str1 == str2:
        return 1.0

    # Use simple character overlap metric
    set1 = set(str1)
    set2 = set(str2)

    if not set1 or not set2:
        return 0.0

    intersection = len(set1 & set2)
    union = len(set1 | set2)

    return intersection / union if union > 0 else 0.0
