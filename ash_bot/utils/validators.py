"""Data validation utilities."""

from difflib import SequenceMatcher
from typing import Optional
import re


def validate_amount(amount: float, tolerance: float = 0.01) -> bool:
    """Validate that amount is a positive number."""
    try:
        return float(amount) > 0
    except (TypeError, ValueError):
        return False


def calculate_tolerance(invoice_amount: float) -> float:
    """
    ACH 수수료 기반 허용 오차 계산.
    규칙: MAX($2, 청구금액 × 0.1%), 최대 $50
    - $2: ACH 최대 수수료 $1.50 + 안전 마진
    - 0.1%: 대형 거래도 비율 커버
    - $50: 너무 큰 차이는 수동 검토
    """
    pct_based: float = float(invoice_amount) * 0.001  # 0.1%
    return min(max(2.0, pct_based), 50.0)


def amounts_match(amount1: float, amount2: float, tolerance: Optional[float] = None) -> bool:
    """
    Check if two amounts match within tolerance.
    tolerance가 None이면 calculate_tolerance로 동적 계산.
    """
    if not validate_amount(amount1) or not validate_amount(amount2):
        return False
    if tolerance is None:
        tolerance = calculate_tolerance(max(float(amount1), float(amount2)))
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
    두 가지 방식을 결합해서 더 나은 점수를 반환:
    1. SequenceMatcher: 문자 수준 유사도 ("SAMSUNG" vs "Samsung" 처리)
    2. 단어 토큰 Jaccard: 단어 단위 공통 비율 ("Samsung Electronics" vs "Samsung Electronics Co Ltd")
    """
    if not str1 or not str2:
        return 0.0

    s1: str = str1.lower().strip()
    s2: str = str2.lower().strip()

    if s1 == s2:
        return 1.0

    seq_ratio: float = SequenceMatcher(None, s1, s2).ratio()

    words1 = set(s1.split())
    words2 = set(s2.split())
    if words1 and words2:
        intersection = len(words1 & words2)
        union = len(words1 | words2)
        word_ratio: float = intersection / union if union > 0 else 0.0
    else:
        word_ratio = 0.0

    return max(seq_ratio, word_ratio)
