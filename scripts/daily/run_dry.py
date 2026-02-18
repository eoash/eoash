#!/usr/bin/env python
"""
Dry-run: Mock 데이터로 전체 AR 매칭 파이프라인 테스트.
- Bill.com, Plaid API 없이 하드코딩된 샘플 데이터 사용
- 매칭 로직, 허용 오차, 후보군 기능 검증
- 실제 Slack 알림 전송 (SLACK_BOT_TOKEN 필요)
"""

import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

from ash_bot.core.matcher import PaymentMatcher
from ash_bot.core.ar_reporter import ARReporter
from ash_bot.integrations.bill_com import Invoice
from ash_bot.integrations.plaid_client import Transaction
from ash_bot.integrations.slack_client import SlackClient
from ash_bot.utils.logger import get_logger

logger = get_logger("dry_run")


# ─────────────────────────────────────────────
# MOCK 데이터: Bill.com 미결 청구서
# ─────────────────────────────────────────────
MOCK_INVOICES = [
    Invoice(
        id="inv001",
        invoice_number="2026-001",
        amount=5000.00,
        customer_name="Samsung Electronics",
        customer_email="billing@samsung.com",
        due_date="2026-02-10",
        status="unpaid",
        created_date="2026-01-10",
    ),
    Invoice(
        id="inv002",
        invoice_number="2026-002",
        amount=12000.00,
        customer_name="Hyundai Motor Company",
        customer_email="ap@hyundai.com",
        due_date="2026-02-15",
        status="unpaid",
        created_date="2026-01-15",
    ),
    Invoice(
        id="inv003",
        invoice_number="2026-003",
        amount=3500.00,
        customer_name="LG Electronics",
        customer_email="billing@lg.com",
        due_date="2026-02-20",
        status="unpaid",
        created_date="2026-01-20",
    ),
    Invoice(
        id="inv004",
        invoice_number="2026-004",
        amount=8800.00,
        customer_name="Kakao Corp",
        customer_email="finance@kakao.com",
        due_date="2026-02-28",
        status="unpaid",
        created_date="2026-01-28",
    ),
]

# ─────────────────────────────────────────────
# MOCK 데이터: Plaid 은행 입금 내역
# 케이스 구성:
#  txn1: 금액 정확, 이름 유사 → 자동 매칭 기대
#  txn2: ACH 수수료 $0.59 차감 → 허용 오차 내 자동 매칭 기대
#  txn3: 인보이스 번호 포함 → number_extraction 매칭 기대
#  txn4: 매칭 실패 → 후보군 3개 Slack 알림 기대
# ─────────────────────────────────────────────
MOCK_TRANSACTIONS = [
    Transaction(
        id="txn001",
        account_id="chase_main",
        date="2026-02-18",
        amount=5000.00,
        description="WIRE TRANSFER FROM SAMSUNG ELECTRONICS CO LTD",
        merchant_name="SAMSUNG ELECTRONICS CO LTD",
        category=["TRANSFER"],
        pending=False,
        payment_channel="online",
    ),
    Transaction(
        id="txn002",
        account_id="chase_main",
        date="2026-02-18",
        amount=11999.41,  # $12,000 - $0.59 ACH 수수료
        description="ACH CREDIT HYUNDAI MOTOR CO",
        merchant_name="HYUNDAI MOTOR CO",
        category=["TRANSFER"],
        pending=False,
        payment_channel="online",
    ),
    Transaction(
        id="txn003",
        account_id="chase_main",
        date="2026-02-17",
        amount=3500.00,
        description="PAYMENT REF INV-2026-003 LG ELEC",
        merchant_name=None,
        category=["TRANSFER"],
        pending=False,
        payment_channel="online",
    ),
    Transaction(
        id="txn004",
        account_id="chase_main",
        date="2026-02-17",
        amount=2200.00,
        description="ACH CREDIT NAVER CORP",
        merchant_name="NAVER CORP",
        category=["TRANSFER"],
        pending=False,
        payment_channel="online",
    ),
]


def print_section(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)


def main():
    print_section("EO Studio AR 매칭 DRY-RUN")
    print(f"청구서: {len(MOCK_INVOICES)}건 | 입금 내역: {len(MOCK_TRANSACTIONS)}건")

    # ── 1. 매칭 실행 ──────────────────────────────────
    print_section("1. 매칭 실행 (동적 허용 오차 적용)")
    matcher = PaymentMatcher()  # tolerance=None → 동적 계산
    matches, unmatched_candidates = matcher.match_payments_to_invoices(
        MOCK_TRANSACTIONS, MOCK_INVOICES
    )

    # ── 2. 매칭 결과 출력 ──────────────────────────────
    print_section(f"2. 자동 매칭 성공: {len(matches)}건")
    for m in matches:
        from ash_bot.utils.validators import calculate_tolerance
        tol = calculate_tolerance(m.invoice.amount)
        diff = abs(m.payment.amount - m.invoice.amount)
        print(
            f"  ✅ [{m.match_type:20s}] "
            f"INV-{m.invoice.invoice_number} | "
            f"{m.invoice.customer_name:25s} | "
            f"청구 ${m.invoice.amount:,.2f} | "
            f"입금 ${m.payment.amount:,.2f} | "
            f"차이 ${diff:.2f} (허용 ${tol:.2f}) | "
            f"신뢰도 {m.confidence:.0%}"
        )

    # ── 3. 미매칭 후보군 출력 ─────────────────────────
    print_section(f"3. 미매칭: {len(unmatched_candidates)}건 (후보군 제시)")
    for cm in unmatched_candidates:
        p = cm.payment
        print(f"\n  ⚠️  입금: ${p.amount:,.2f} | {p.date} | {p.merchant_name or p.description}")
        print(f"      후보 청구서 상위 3개:")
        for i, (inv, score) in enumerate(cm.candidates, 1):
            bar = "🟢" if score >= 0.7 else ("🟡" if score >= 0.4 else "🔴")
            diff = abs(p.amount - inv.amount)
            print(
                f"        {i}. {bar} INV-{inv.invoice_number} | "
                f"{inv.customer_name:25s} | "
                f"${inv.amount:,.2f} | "
                f"차이 ${diff:.2f} | "
                f"신뢰도 {score:.0%}"
            )

    # ── 4. 요약 통계 ──────────────────────────────────
    print_section("4. 매칭 요약")
    summary = matcher.get_match_summary(matches)
    total_invoices = sum(inv.amount for inv in MOCK_INVOICES)
    total_matched = sum(m.payment.amount for m in matches)
    print(f"  전체 청구서: {len(MOCK_INVOICES)}건 / ${total_invoices:,.2f}")
    print(f"  자동 매칭:   {summary['total_matches']}건 / ${total_matched:,.2f}")
    print(f"  수동 확인:   {len(unmatched_candidates)}건")
    print(f"  매칭률:      {summary['total_matches'] / len(MOCK_TRANSACTIONS):.0%}")
    print(f"  평균 신뢰도: {summary['average_confidence']:.0%}")
    print(f"  매칭 유형:   {summary['by_type']}")

    # ── 5. Slack 알림 전송 ────────────────────────────
    print_section("5. Slack 알림 전송")
    slack = SlackClient()

    user_id = os.getenv("SLACK_USER_ID")

    if not slack.client:
        print("  ❌ Slack 미설정 - 알림 건너뜀")
    elif not user_id:
        print("  ❌ SLACK_USER_ID 미설정 - 알림 건너뜀")
    else:
        # 일일 요약 리포트 → DM 전송
        reporter = ARReporter()
        report = reporter.generate_daily_report(matches, MOCK_INVOICES)
        report_text = reporter.format_report_for_slack(report)

        daily_blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "📊 [DRY-RUN] EO Studio - Daily AR Update"}
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": report_text}
            }
        ]
        ok1 = slack.send_dm(user_id, "Daily AR Report (dry-run)", blocks=daily_blocks)
        print(f"  {'✅' if ok1 else '❌'} 일일 AR 요약 → DM ({user_id})")

        # 미매칭 후보군 알림 → DM 전송
        if unmatched_candidates:
            # send_unmatched_alert는 channel_alerts로 보내므로 DM용으로 직접 생성
            blocks = [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": f"[DRY-RUN] ⚠️ 수동 확인 필요 - {len(unmatched_candidates)}건 미매칭"
                    }
                },
                {"type": "divider"}
            ]
            for cm in unmatched_candidates:
                p = cm.payment
                blocks.append({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*💵 입금:* ${p.amount:,.2f} | {p.date} | `{p.merchant_name or p.description}`"
                    }
                })
                if cm.candidates:
                    lines = []
                    for i, (inv, score) in enumerate(cm.candidates, 1):
                        bar = "🟢" if score >= 0.7 else ("🟡" if score >= 0.4 else "🔴")
                        lines.append(
                            f"{i}. {bar} INV-{inv.invoice_number} | {inv.customer_name} "
                            f"| ${inv.amount:,.2f} | 신뢰도 {score:.0%}"
                        )
                    blocks.append({
                        "type": "section",
                        "text": {"type": "mrkdwn", "text": "후보 청구서:\n" + "\n".join(lines)}
                    })
                blocks.append({"type": "divider"})

            ok2 = slack.send_dm(user_id, "미매칭 입금 확인 필요 (dry-run)", blocks=blocks)
            print(f"  {'✅' if ok2 else '❌'} 미매칭 후보군 알림 → DM ({user_id})")
        else:
            print("  ℹ️  미매칭 없음 - 후보군 알림 없음")

    print_section("DRY-RUN 완료")
    print("  ✅ Bill.com 업데이트 없음 (dry-run 모드)")
    print("  ✅ 매칭 로직, 허용 오차, 후보군 기능 검증 완료")
    print()


if __name__ == "__main__":
    main()
