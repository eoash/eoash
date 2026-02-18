#!/usr/bin/env python
"""
API 연결 테스트 스크립트.
각 서비스 연결 상태를 순서대로 확인하고 결과 출력.
"""

import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

from ash_bot.config import BillComConfig, QuickBooksConfig, SlackConfig
from ash_bot.utils.logger import get_logger

logger = get_logger("test_connections")
results = {}


def section(title):
    print(f"\n{'─'*50}")
    print(f"  {title}")
    print('─'*50)


# ── 1. Bill.com ──────────────────────────────────
section("1. Bill.com 연결 테스트")
try:
    BillComConfig.validate()
    from ash_bot.integrations.bill_com import BillComClient
    client = BillComClient()
    ok = client.login()
    if ok:
        print(f"  ✅ 로그인 성공 (Session ID: {client.session_id[:8]}...)")
        invoices = client.get_outstanding_invoices()
        print(f"  ✅ 미결 청구서 {len(invoices)}건 조회 성공")
        if invoices:
            print(f"     예시: INV-{invoices[0].invoice_number} | {invoices[0].customer_name} | ${invoices[0].amount:,.2f}")
        results["bill_com"] = "OK"
    else:
        print("  ❌ 로그인 실패 - 이메일/비밀번호 또는 API Key 확인")
        results["bill_com"] = "FAIL"
except ValueError as e:
    print(f"  ❌ 설정 오류: {e}")
    results["bill_com"] = "NOT_CONFIGURED"
except Exception as e:
    print(f"  ❌ 오류: {e}")
    results["bill_com"] = "ERROR"


# ── 2. QuickBooks ────────────────────────────────
section("2. QuickBooks 연결 테스트")
try:
    QuickBooksConfig.validate()
    from ash_bot.integrations.quickbooks_client import QuickBooksClient
    qb = QuickBooksClient()
    ok = qb.test_connection()
    if ok:
        print("  ✅ QuickBooks 연결 성공")
        payments = qb.get_recent_payments(days=7)
        print(f"  ✅ 최근 7일 입금 {len(payments)}건 조회 성공")
        if payments:
            print(f"     예시: {payments[0].customer_name} | ${payments[0].amount:,.2f} | {payments[0].payment_date}")
        results["quickbooks"] = "OK"
    else:
        print("  ❌ 연결 실패 - Realm ID 또는 Refresh Token 확인")
        results["quickbooks"] = "FAIL"
except ValueError as e:
    print(f"  ❌ 설정 오류: {e}")
    results["quickbooks"] = "NOT_CONFIGURED"
except Exception as e:
    print(f"  ❌ 오류: {e}")
    results["quickbooks"] = "ERROR"


# ── 3. Slack ─────────────────────────────────────
section("3. Slack 연결 테스트")
try:
    SlackConfig.validate()
    from ash_bot.integrations.slack_client import SlackClient
    slack = SlackClient()
    ok = slack.test_connection()
    if ok:
        print("  ✅ Slack 연결 성공")
        results["slack"] = "OK"
    else:
        print("  ❌ Slack 연결 실패")
        results["slack"] = "FAIL"
except ValueError as e:
    print(f"  ❌ 설정 오류: {e}")
    results["slack"] = "NOT_CONFIGURED"
except Exception as e:
    print(f"  ❌ 오류: {e}")
    results["slack"] = "ERROR"


# ── 최종 요약 ─────────────────────────────────────
section("연결 테스트 요약")
icons = {"OK": "✅", "FAIL": "❌", "NOT_CONFIGURED": "⚙️ ", "ERROR": "💥"}
for service, status in results.items():
    icon = icons.get(status, "?")
    print(f"  {icon} {service:15s}: {status}")

all_ok = all(v == "OK" for v in results.values())
print()
if all_ok:
    print("  모든 연결 성공 → 실제 AR 자동화 실행 준비 완료!")
    print("  실행: python scripts/daily/run_daily.py")
else:
    print("  일부 연결 실패 → 위 오류 메시지 확인 후 .env 수정")
print()
