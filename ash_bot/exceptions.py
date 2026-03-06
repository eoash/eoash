"""ash_bot 도메인 예외 계층."""


class AshBotError(Exception):
    """ash_bot 전체 베이스 예외."""


# ── Bill.com ──────────────────────────────────────────────
class BillComError(AshBotError):
    """Bill.com 관련 오류."""


class BillComAuthError(BillComError):
    """Bill.com 로그인/세션 인증 실패."""


class InvoiceFetchError(BillComError):
    """청구서 조회 실패."""


class InvoiceUpdateError(BillComError):
    """청구서 상태 업데이트 실패."""


# ── Gmail ─────────────────────────────────────────────────
class GmailError(AshBotError):
    """Gmail 관련 오류."""


class GmailAuthError(GmailError):
    """Gmail OAuth 인증 실패."""
