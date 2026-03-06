"""
매칭 전략 모듈 — Strategy Pattern 구현.

MatchResult / CandidateMatch 데이터 클래스와 3가지 전략을 정의한다.
matcher.py는 이 모듈에서 MatchResult, CandidateMatch, 전략 클래스를 임포트한다.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from ash_bot.integrations.bill_com import Invoice
from ash_bot.integrations.plaid_client import Transaction
from ash_bot.utils.validators import (
    amounts_match,
    fuzzy_match_similarity,
    extract_invoice_number,
)


# ── 데이터 클래스 ──────────────────────────────────────────

@dataclass
class MatchResult:
    """결제-청구서 매칭 결과."""
    payment: Transaction
    invoice: Invoice
    confidence: float       # 0.0 ~ 1.0
    match_type: str         # "exact", "number_extraction", "fuzzy"
    amount_diff: float      # 금액 차이 (달러)


@dataclass
class CandidateMatch:
    """매칭 실패한 입금에 대한 후보 청구서 목록."""
    payment: Transaction
    candidates: List[Tuple[Invoice, float]] = field(default_factory=list)
    # candidates: [(invoice, confidence_score), ...] 상위 3개


# ── Strategy ABC ───────────────────────────────────────────

class MatchingStrategy(ABC):
    """결제-청구서 매칭 전략 인터페이스."""

    @abstractmethod
    def match(
        self,
        payment: Transaction,
        invoices: List[Invoice],
        tolerance: Optional[float] = None,
    ) -> Optional[MatchResult]:
        """매칭 시도. 매칭 성공 시 MatchResult, 실패 시 None."""


# ── 구체 전략 1: 정확한 금액 + 날짜 매칭 ──────────────────

class ExactAmountStrategy(MatchingStrategy):
    """금액이 정확히 일치하고 결제일이 청구일 이후인 경우."""

    def match(
        self,
        payment: Transaction,
        invoices: List[Invoice],
        tolerance: Optional[float] = None,
    ) -> Optional[MatchResult]:
        for invoice in invoices:
            if not amounts_match(payment.amount, invoice.amount, tolerance):
                continue
            if payment.date < invoice.created_date:
                continue
            return MatchResult(
                payment=payment,
                invoice=invoice,
                confidence=1.0,
                match_type="exact",
                amount_diff=0.0,
            )
        return None


# ── 구체 전략 2: 결제 설명에서 청구서 번호 추출 ────────────

class InvoiceNumberStrategy(MatchingStrategy):
    """결제 설명(description)에서 청구서 번호를 추출해 매칭."""

    def match(
        self,
        payment: Transaction,
        invoices: List[Invoice],
        tolerance: Optional[float] = None,
    ) -> Optional[MatchResult]:
        invoice_number = extract_invoice_number(payment.description)
        if not invoice_number:
            return None

        for invoice in invoices:
            if invoice.invoice_number != invoice_number:
                continue
            # 번호가 일치해도 금액이 크게 다르면 제외 (허용 오차 10배 적용)
            relaxed_tol = (tolerance * 10) if tolerance is not None else None
            if amounts_match(payment.amount, invoice.amount, relaxed_tol):
                return MatchResult(
                    payment=payment,
                    invoice=invoice,
                    confidence=0.95,
                    match_type="number_extraction",
                    amount_diff=abs(float(payment.amount) - float(invoice.amount)),
                )
        return None


# ── 구체 전략 3: 고객명 퍼지 매칭 ─────────────────────────

class FuzzyNameStrategy(MatchingStrategy):
    """고객명 유사도를 기준으로 퍼지 매칭."""

    CONFIDENCE_THRESHOLD = 0.7   # 이 값 이상이어야 매칭으로 인정
    MIN_CONFIDENCE = 0.5          # 후보 수집 최소 기준

    def match(
        self,
        payment: Transaction,
        invoices: List[Invoice],
        tolerance: Optional[float] = None,
    ) -> Optional[MatchResult]:
        merchant = payment.merchant_name or payment.description
        best_match: Optional[Invoice] = None
        best_confidence = 0.0

        for invoice in invoices:
            # 날짜 체크: 결제일이 청구서 생성일 이전이면 제외
            if payment.date < invoice.created_date:
                continue
            similarity = fuzzy_match_similarity(merchant, invoice.customer_name)
            if similarity > best_confidence:
                best_confidence = similarity
                best_match = invoice

        if best_match and best_confidence >= self.CONFIDENCE_THRESHOLD:
            return MatchResult(
                payment=payment,
                invoice=best_match,
                confidence=best_confidence,
                match_type="fuzzy",
                amount_diff=abs(float(payment.amount) - float(best_match.amount)),
            )
        return None


# ── 기본 전략 순서 ─────────────────────────────────────────

DEFAULT_STRATEGIES: List[MatchingStrategy] = [
    ExactAmountStrategy(),
    InvoiceNumberStrategy(),
    FuzzyNameStrategy(),
]
