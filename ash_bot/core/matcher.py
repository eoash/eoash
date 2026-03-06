"""Payment-to-invoice matching logic."""

from typing import Dict, List, Optional, Tuple

from ash_bot.integrations.bill_com import Invoice
from ash_bot.integrations.plaid_client import Transaction
from ash_bot.utils.validators import calculate_tolerance, fuzzy_match_similarity
from ash_bot.utils.logger import get_logger
from ash_bot.core.matching_strategies import (
    CandidateMatch,
    DEFAULT_STRATEGIES,
    MatchingStrategy,
    MatchResult,
)

# Re-export so existing imports (e.g. test_matcher.py) continue to work
__all__ = ["PaymentMatcher", "MatchResult", "CandidateMatch"]

logger = get_logger(__name__)


class PaymentMatcher:
    """Bank transaction → outstanding invoice 매칭."""

    def __init__(
        self,
        tolerance: Optional[float] = None,
        strategies: Optional[List[MatchingStrategy]] = None,
    ):
        """
        Initialize payment matcher.

        Args:
            tolerance: 고정 허용 오차(달러). None이면 청구 금액에 따라 동적 계산.
            strategies: 매칭 전략 목록. None이면 기본 순서(exact → number → fuzzy) 사용.
        """
        self.tolerance = tolerance
        self.strategies = strategies if strategies is not None else DEFAULT_STRATEGIES

    def match_payment_to_invoice(
        self,
        payment: Transaction,
        invoices: List[Invoice],
    ) -> Optional[MatchResult]:
        """
        단일 결제를 청구서 목록에서 매칭.

        Args:
            payment: Bank transaction
            invoices: 미결 청구서 목록

        Returns:
            MatchResult (매칭 성공) 또는 None
        """
        if payment.amount <= 0:
            logger.debug(f"음수/제로 금액 스킵: {payment.amount}")
            return None

        amount_candidates = self._get_amount_candidates(payment.amount, invoices)
        if not amount_candidates:
            logger.debug(f"금액 {payment.amount}에 해당하는 청구서 없음")
            return None

        for strategy in self.strategies:
            result = strategy.match(payment, amount_candidates, self.tolerance)
            if result:
                return result

        return None

    def match_payments_to_invoices(
        self,
        payments: List[Transaction],
        invoices: List[Invoice],
    ) -> Tuple[List[MatchResult], List[CandidateMatch]]:
        """
        다수 결제를 청구서 목록에서 일괄 매칭.

        Returns:
            (matches, unmatched_with_candidates)
        """
        logger.info(f"결제 {len(payments)}건 → 청구서 {len(invoices)}건 매칭 시작")

        matches: List[MatchResult] = []
        matched_invoice_ids: set = set()
        unmatched: List[CandidateMatch] = []

        sorted_invoices = sorted(invoices, key=lambda x: x.amount)

        for payment in payments:
            available = [inv for inv in sorted_invoices if inv.id not in matched_invoice_ids]
            result = self.match_payment_to_invoice(payment, available)

            if result:
                matches.append(result)
                matched_invoice_ids.add(result.invoice.id)
                logger.info(
                    f"매칭 성공: ${payment.amount} ({payment.date}) "
                    f"→ {result.invoice.invoice_number} "
                    f"(신뢰도: {result.confidence:.2%})"
                )
            else:
                candidates = self._get_top_candidates(payment, sorted_invoices)
                unmatched.append(CandidateMatch(payment=payment, candidates=candidates))
                logger.debug(
                    f"매칭 실패: ${payment.amount} ({payment.date}), "
                    f"후보 {len(candidates)}건"
                )

        logger.info(f"매칭 완료: 성공 {len(matches)}건, 실패 {len(unmatched)}건")
        return matches, unmatched

    def _get_amount_candidates(self, amount: float, invoices: List[Invoice]) -> List[Invoice]:
        """금액 허용 오차 내 후보 청구서 필터링."""
        from ash_bot.utils.validators import amounts_match
        return [inv for inv in invoices if amounts_match(amount, inv.amount, self.tolerance)]

    def _get_top_candidates(
        self,
        payment: Transaction,
        invoices: List[Invoice],
        n: int = 3,
    ) -> List[Tuple[Invoice, float]]:
        """
        매칭 실패 결제에 대해 전체 청구서에서 유사도 상위 N개 후보 반환.

        점수: 고객명 유사도 70% + 금액 근접도 30%
        """
        merchant = payment.merchant_name or payment.description
        tolerance = calculate_tolerance(payment.amount)

        scored = []
        for invoice in invoices:
            name_score = fuzzy_match_similarity(merchant, invoice.customer_name)
            amount_diff = abs(float(payment.amount) - float(invoice.amount))
            if amount_diff <= tolerance:
                amount_score = 1.0
            elif amount_diff <= tolerance * 5:
                amount_score = 0.5
            else:
                amount_score = 0.0

            combined = (name_score * 0.7) + (amount_score * 0.3)
            scored.append((invoice, round(combined, 3)))

        return sorted(scored, key=lambda x: x[1], reverse=True)[:n]

    def get_match_summary(self, matches: List[MatchResult]) -> Dict:
        """매칭 결과 통계 요약."""
        return {
            "total_matches": len(matches),
            "total_amount": sum(m.payment.amount for m in matches),
            "by_confidence": {
                "high": sum(1 for m in matches if m.confidence >= 0.95),
                "medium": sum(1 for m in matches if 0.7 <= m.confidence < 0.95),
                "low": sum(1 for m in matches if m.confidence < 0.7),
            },
            "by_type": {
                match_type: sum(1 for m in matches if m.match_type == match_type)
                for match_type in {m.match_type for m in matches}
            },
            "average_confidence": (
                sum(m.confidence for m in matches) / len(matches) if matches else 0
            ),
        }
