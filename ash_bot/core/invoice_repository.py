"""청구서 저장소 인터페이스 (Protocol 기반)."""

from typing import List, Protocol, runtime_checkable

from ash_bot.integrations.bill_com import Invoice


@runtime_checkable
class InvoiceRepository(Protocol):
    """
    청구서 데이터 접근 추상화.

    BillComClient가 이 Protocol을 암묵적으로 충족한다.
    테스트에서는 FakeInvoiceRepository를 직접 구현해서 주입할 수 있다.

    Example (테스트용 Fake 구현):
        class FakeInvoiceRepository:
            def __init__(self, invoices: list[Invoice]):
                self._invoices = invoices

            def get_outstanding_invoices(self) -> list[Invoice]:
                return self._invoices

            def get_paid_invoices(self, days_back: int = 7) -> list[Invoice]:
                return []

            def update_invoice_status(
                self, invoice_id: str, paid_date: str, status: str = "paid"
            ) -> bool:
                return True
    """

    def get_outstanding_invoices(self) -> List[Invoice]:
        """미결(unpaid) 청구서 목록 반환."""
        ...

    def get_paid_invoices(self, days_back: int = 7) -> List[Invoice]:
        """최근 납부 청구서 목록 반환."""
        ...

    def update_invoice_status(
        self, invoice_id: str, paid_date: str, status: str = "paid"
    ) -> bool:
        """청구서 상태 업데이트."""
        ...
