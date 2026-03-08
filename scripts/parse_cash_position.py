#!/usr/bin/env python3
"""
Cash Position 자동 파싱 스크립트

Clobe.ai(한국) + Chase + Hanmi + 우리VN 파일을 읽어서
Google Sheets Cash Position Summary에 월별 데이터를 입력한다.

사용법:
  python scripts/parse_cash_position.py \
    --clobe ~/Downloads/주식회사*.xlsx \
    --chase ~/Downloads/Chase*.CSV \
    --hanmi ~/Downloads/AccountHistory.csv \
    --vietnam ~/Downloads/ExcelSheet*.xls \
    --month 2026.03 \
    [--dry-run]
"""

import argparse
import glob
import json
import re
import sys
import warnings
from datetime import datetime
from pathlib import Path

import pandas as pd

warnings.filterwarnings("ignore")

# ─── 파서들 ──────────────────────────────────────

def parse_clobe(filepath):
    """Clobe.ai 엑셀 → 한국 법인 합산 (KRW)"""
    df = pd.read_excel(filepath, sheet_name="계좌")
    # Row 1 = 헤더, Row 2~11 = 데이터, Row 12 = 합계
    # 컬럼: 계좌구분, 은행, 계좌번호, 계좌별칭, 통화, 기초잔액, 입금, 출금, 대체, 기말잔액
    header_idx = None
    for i, row in df.iterrows():
        vals = [str(v).strip() for v in row.values if pd.notna(v)]
        if "기초 잔액" in vals or "기초잔액" in vals:
            header_idx = i
            break

    if header_idx is None:
        raise ValueError("Clobe 파일에서 헤더를 찾을 수 없습니다")

    total_idx = None
    for i in range(header_idx + 1, len(df)):
        vals = [str(v).strip() for v in df.iloc[i].values if pd.notna(v)]
        if "합계" in vals:
            total_idx = i
            break

    if total_idx is None:
        raise ValueError("Clobe 파일에서 합계 행을 찾을 수 없습니다")

    row = df.iloc[total_idx]
    # 합계 행: [합계, NaN, NaN, NaN, NaN, 기초잔액, 입금, 출금, 대체, 기말잔액]
    values = [v for v in row.values if pd.notna(v)]
    # values = ['합계', 기초잔액, 입금, 출금, 대체, 기말잔액]
    nums = [v for v in values if isinstance(v, (int, float))]

    if len(nums) >= 4:
        return {
            "region": "Korea",
            "currency": "KRW",
            "balance": int(nums[-1]),       # 기말잔액
            "inflows": int(nums[1]),        # 입금
            "outflows": int(nums[2]),       # 출금
            "net_change": int(nums[1]) - int(nums[2]),
        }
    raise ValueError(f"Clobe 합계 행 파싱 실패: {values}")


def parse_chase(filepath):
    """Chase Bank CSV → USD"""
    df = pd.read_csv(filepath)
    # Details=DEBIT/CREDIT, Amount=+/-, Balance
    df["Amount"] = pd.to_numeric(df["Amount"], errors="coerce").fillna(0)

    inflows = df[df["Amount"] > 0]["Amount"].sum()
    outflows = abs(df[df["Amount"] < 0]["Amount"].sum())
    # 가장 최근 Balance = 첫 번째 행
    balance = df.iloc[0]["Balance"]
    net_change = inflows - outflows

    return {
        "region": "Chase",
        "currency": "USD",
        "balance": round(balance, 2),
        "inflows": round(inflows, 2),
        "outflows": round(outflows, 2),
        "net_change": round(net_change, 2),
    }


def parse_hanmi(filepath):
    """Hanmi Bank CSV → USD"""
    df = pd.read_csv(filepath)
    df["Debit"] = pd.to_numeric(df["Debit"], errors="coerce").fillna(0)
    df["Credit"] = pd.to_numeric(df["Credit"], errors="coerce").fillna(0)

    inflows = df["Credit"].sum()
    outflows = df["Debit"].sum()
    balance = df.iloc[0]["Balance"]
    net_change = inflows - outflows

    return {
        "region": "Hanmi",
        "currency": "USD",
        "balance": round(balance, 2),
        "inflows": round(inflows, 2),
        "outflows": round(outflows, 2),
        "net_change": round(net_change, 2),
    }


def parse_vietnam(filepath, year=None, month=None):
    """우리은행 베트남 xls → VND (year/month 지정 시 해당 월만 필터)"""
    df = pd.read_excel(filepath, sheet_name="Sheet1", header=None)

    # 메타 정보 추출
    account_name = ""
    for i, row in df.iterrows():
        cell = str(row.iloc[0] or "")
        if "계좌번호" in cell:
            account_name = cell
            break

    # 데이터 행 찾기 (거래일시 헤더)
    data_start = None
    for i, row in df.iterrows():
        cell = str(row.iloc[0] or "").strip()
        if "거래일시" in cell:
            data_start = i + 1
            break

    if data_start is None:
        raise ValueError("베트남 파일에서 데이터 시작점을 찾을 수 없습니다")

    def parse_vnd(val):
        if pd.isna(val):
            return 0
        s = str(val).replace(",", "").replace(" ", "").strip()
        try:
            return int(float(s))
        except ValueError:
            return 0

    total_out = 0
    total_in = 0
    last_balance = 0

    for i in range(data_start, len(df)):
        row = df.iloc[i]
        if pd.isna(row.iloc[0]):
            break
        # 날짜 파싱: "DD.MM.YYYY HH:MM:SS"
        date_str = str(row.iloc[0]).strip()
        try:
            txn_date = datetime.strptime(date_str.split()[0], "%d.%m.%Y")
        except (ValueError, IndexError):
            continue

        out_amt = parse_vnd(row.iloc[2])   # 찾으신금액 (출금)
        in_amt = parse_vnd(row.iloc[3])    # 맡기신금액 (입금)
        bal = parse_vnd(row.iloc[4])       # 거래후잔액

        # year, month가 전달되면 필터링
        if year and month:
            if txn_date.year != year or txn_date.month != month:
                continue

        total_out += out_amt
        total_in += in_amt
        if last_balance == 0:
            last_balance = bal  # 가장 최근 잔액

    return {
        "region": "Vietnam",
        "currency": "VND",
        "balance": last_balance,
        "inflows": total_in,
        "outflows": total_out,
        "net_change": total_in - total_out,
    }


# ─── 월 필터링 ──────────────────────────────────

def filter_chase_by_month(filepath, year, month):
    """Chase CSV에서 특정 월 데이터만 추출.
    Chase CSV 컬럼이 1칸 밀려있음:
      Details = "DEBIT  MM/DD/YYYY", Posting Date = Description,
      Description = Amount, Amount = Type, Type = Balance
    """
    # Chase CSV: DEBIT/CREDIT가 index로 흡수되어 컬럼이 1칸 밀림
    # Details=날짜, Posting Date=설명, Description=금액, Amount=Type, Type=Balance
    df = pd.read_csv(filepath)
    df["_date"] = pd.to_datetime(df["Details"], format="%m/%d/%Y", errors="coerce")
    df["_amount"] = pd.to_numeric(df["Description"], errors="coerce").fillna(0)
    df["_balance"] = pd.to_numeric(df["Type"], errors="coerce")

    df = df.dropna(subset=["_date"])
    mask = (df["_date"].dt.year == year) & (df["_date"].dt.month == month)
    filtered = df[mask]

    if filtered.empty:
        return {"region": "Chase", "currency": "USD", "balance": 0, "inflows": 0, "outflows": 0, "net_change": 0}

    inflows = filtered[filtered["_amount"] > 0]["_amount"].sum()
    outflows = abs(filtered[filtered["_amount"] < 0]["_amount"].sum())
    balance = filtered["_balance"].dropna().iloc[0] if filtered["_balance"].notna().any() else 0

    return {
        "region": "Chase",
        "currency": "USD",
        "balance": round(float(balance), 2),
        "inflows": round(inflows, 2),
        "outflows": round(outflows, 2),
        "net_change": round(inflows - outflows, 2),
    }


def filter_hanmi_by_month(filepath, year, month):
    """Hanmi CSV에서 특정 월 데이터만 추출"""
    df = pd.read_csv(filepath)
    df["Debit"] = pd.to_numeric(df["Debit"], errors="coerce").fillna(0)
    df["Credit"] = pd.to_numeric(df["Credit"], errors="coerce").fillna(0)
    df["_date"] = pd.to_datetime(df["Post Date"])
    mask = (df["_date"].dt.year == year) & (df["_date"].dt.month == month)
    filtered = df[mask]

    if filtered.empty:
        return {"region": "Hanmi", "currency": "USD", "balance": 0, "inflows": 0, "outflows": 0, "net_change": 0}

    inflows = filtered["Credit"].sum()
    outflows = filtered["Debit"].sum()
    balance = filtered.iloc[0]["Balance"]

    return {
        "region": "Hanmi",
        "currency": "USD",
        "balance": round(balance, 2),
        "inflows": round(inflows, 2),
        "outflows": round(outflows, 2),
        "net_change": round(inflows - outflows, 2),
    }


# ─── Google Sheets 업데이트 ──────────────────────

def get_sheets_service():
    """Google Sheets API 서비스 생성"""
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    env_path = Path(__file__).parent.parent / "finance-dashboard" / ".env.local"
    content = env_path.read_text()

    email = ""
    sid = ""
    for line in content.split("\n"):
        if line.startswith("GOOGLE_SERVICE_ACCOUNT_EMAIL="):
            email = line.split("=", 1)[1]
        if line.startswith("SPREADSHEET_ID="):
            sid = line.split("=", 1)[1]

    m = re.search(r'GOOGLE_PRIVATE_KEY="(-----BEGIN.*?-----END PRIVATE KEY-----)', content, re.DOTALL)
    pk = m.group(1).replace("\\n", "\n") if m else None

    creds = service_account.Credentials.from_service_account_info(
        {"type": "service_account", "project_id": "ash-email-487014",
         "private_key": pk, "client_email": email,
         "token_uri": "https://oauth2.googleapis.com/token"},
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    service = build("sheets", "v4", credentials=creds)
    return service, sid


def find_month_column(service, sid, sheet_name, target_month):
    """헤더 행에서 target_month(예: '2026.03')의 컬럼 인덱스 찾기"""
    result = service.spreadsheets().values().get(
        spreadsheetId=sid, range=f"'{sheet_name}'!A1:Z1"
    ).execute()
    headers = result.get("values", [[]])[0]
    for i, h in enumerate(headers):
        if str(h).strip() == target_month:
            return i
    return None


def col_letter(idx):
    """0-based index → Excel 컬럼 문자 (0=A, 25=Z)"""
    result = ""
    while True:
        result = chr(idx % 26 + ord("A")) + result
        idx = idx // 26 - 1
        if idx < 0:
            break
    return result


def update_sheet(service, sid, sheet_name, col_idx, data):
    """Cash Position Summary 시트에 데이터 쓰기

    data keys: korea, chase, hanmi, vietnam
    """
    c = col_letter(col_idx)

    def fmt_krw(val):
        if val < 0:
            return f"(₩{abs(int(val)):,})"
        return f"₩{int(val):,} "

    def fmt_usd(val):
        if val < 0:
            return f"-${abs(val):,.2f}"
        return f"${val:,.2f}"

    def fmt_vnd(val):
        if val < 0:
            return f"({abs(int(val)):,} ₫)"
        return f"{int(val):,} ₫"

    updates = []
    kr = data.get("korea")
    ch = data.get("chase")
    hm = data.get("hanmi")
    vn = data.get("vietnam")

    # Korea (KRW) — Row 2~5
    if kr:
        updates.append({"range": f"'{sheet_name}'!{c}2", "values": [[fmt_krw(kr["balance"])]]})
        updates.append({"range": f"'{sheet_name}'!{c}3", "values": [[fmt_krw(kr["inflows"])]]})
        updates.append({"range": f"'{sheet_name}'!{c}4", "values": [[fmt_krw(kr["outflows"])]]})
        updates.append({"range": f"'{sheet_name}'!{c}5", "values": [[fmt_krw(kr["net_change"])]]})

    # U.S. (USD) — Row 18~21 (합산)
    if ch and hm:
        us_balance = ch["balance"] + hm["balance"]
        us_inflows = ch["inflows"] + hm["inflows"]
        us_outflows = ch["outflows"] + hm["outflows"]
        us_net = us_inflows - us_outflows

        updates.append({"range": f"'{sheet_name}'!{c}18", "values": [[fmt_usd(us_balance)]]})
        updates.append({"range": f"'{sheet_name}'!{c}19", "values": [[fmt_usd(us_inflows)]]})
        updates.append({"range": f"'{sheet_name}'!{c}20", "values": [[fmt_usd(us_outflows)]]})
        updates.append({"range": f"'{sheet_name}'!{c}21", "values": [[fmt_usd(us_net)]]})

    # Chase Bank — Row 24~27
    if ch:
        updates.append({"range": f"'{sheet_name}'!{c}24", "values": [[fmt_usd(ch["balance"])]]})
        updates.append({"range": f"'{sheet_name}'!{c}25", "values": [[fmt_usd(ch["inflows"])]]})
        updates.append({"range": f"'{sheet_name}'!{c}26", "values": [[fmt_usd(ch["outflows"])]]})
        updates.append({"range": f"'{sheet_name}'!{c}27", "values": [[fmt_usd(ch["net_change"])]]})

    # Hanmi Bank — Row 29~32
    if hm:
        updates.append({"range": f"'{sheet_name}'!{c}29", "values": [[fmt_usd(hm["balance"])]]})
        updates.append({"range": f"'{sheet_name}'!{c}30", "values": [[fmt_usd(hm["inflows"])]]})
        updates.append({"range": f"'{sheet_name}'!{c}31", "values": [[fmt_usd(hm["outflows"])]]})
        updates.append({"range": f"'{sheet_name}'!{c}32", "values": [[fmt_usd(hm["net_change"])]]})

    # Vietnam (VND) — Row 33~36
    if vn:
        updates.append({"range": f"'{sheet_name}'!{c}33", "values": [[fmt_vnd(vn["balance"])]]})
        updates.append({"range": f"'{sheet_name}'!{c}34", "values": [[fmt_vnd(vn["inflows"])]]})
        updates.append({"range": f"'{sheet_name}'!{c}35", "values": [[fmt_vnd(vn["outflows"])]]})
        updates.append({"range": f"'{sheet_name}'!{c}36", "values": [[fmt_vnd(vn["net_change"])]]})

    return updates


# ─── 메인 ──────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Cash Position 자동 파싱")
    parser.add_argument("--clobe", help="Clobe.ai 엑셀 파일 경로")
    parser.add_argument("--chase", help="Chase Bank CSV 경로")
    parser.add_argument("--hanmi", help="Hanmi Bank CSV 경로")
    parser.add_argument("--vietnam", help="우리은행 베트남 xls 경로")
    parser.add_argument("--month", required=True, help="대상 월 (예: 2026.03)")
    parser.add_argument("--dry-run", action="store_true", help="시트 업데이트 없이 결과만 출력")
    args = parser.parse_args()

    # 월 파싱
    year, month = map(int, args.month.split("."))
    sheet_name = f"{year} Cash Position Summary"

    results = {}

    # 1. Korea (Clobe)
    if args.clobe:
        filepath = glob.glob(args.clobe)[0] if "*" in args.clobe else args.clobe
        print(f"📂 Clobe: {Path(filepath).name}")
        results["korea"] = parse_clobe(filepath)
        print(f"   Korea 합산: Balance ₩{results['korea']['balance']:,} | In ₩{results['korea']['inflows']:,} | Out ₩{results['korea']['outflows']:,}")

    # 2. Chase
    if args.chase:
        filepath = glob.glob(args.chase)[0] if "*" in args.chase else args.chase
        print(f"📂 Chase: {Path(filepath).name}")
        results["chase"] = filter_chase_by_month(filepath, year, month)
        d = results["chase"]
        print(f"   Chase: Balance ${d['balance']:,.2f} | In ${d['inflows']:,.2f} | Out ${d['outflows']:,.2f}")

    # 3. Hanmi
    if args.hanmi:
        filepath = glob.glob(args.hanmi)[0] if "*" in args.hanmi else args.hanmi
        print(f"📂 Hanmi: {Path(filepath).name}")
        results["hanmi"] = filter_hanmi_by_month(filepath, year, month)
        d = results["hanmi"]
        print(f"   Hanmi: Balance ${d['balance']:,.2f} | In ${d['inflows']:,.2f} | Out ${d['outflows']:,.2f}")

    # 4. Vietnam
    if args.vietnam:
        filepath = glob.glob(args.vietnam)[0] if "*" in args.vietnam else args.vietnam
        print(f"📂 Vietnam: {Path(filepath).name}")
        results["vietnam"] = parse_vietnam(filepath, year, month)
        d = results["vietnam"]
        print(f"   Vietnam: Balance {d['balance']:,}₫ | In {d['inflows']:,}₫ | Out {d['outflows']:,}₫")

    # US 합산 표시
    if "chase" in results and "hanmi" in results:
        ch, hm = results["chase"], results["hanmi"]
        print(f"\n   🇺🇸 US 합산: Balance ${ch['balance']+hm['balance']:,.2f} | In ${ch['inflows']+hm['inflows']:,.2f} | Out ${ch['outflows']+hm['outflows']:,.2f}")

    if not results:
        print("❌ 파싱할 파일이 없습니다")
        return

    print(f"\n{'='*50}")

    if args.dry_run:
        print("🔍 DRY RUN — 시트 업데이트 건너뜀")
        print(json.dumps(results, indent=2, ensure_ascii=False, default=str))
        return

    # Google Sheets 업데이트
    print(f"📊 Google Sheets 업데이트 중... ({sheet_name} → {args.month})")
    service, sid = get_sheets_service()

    col_idx = find_month_column(service, sid, sheet_name, args.month)
    if col_idx is None:
        # 월 컬럼이 없으면 추가
        print(f"   ⚠️  '{args.month}' 컬럼이 없습니다. 시트에서 직접 추가해주세요.")
        return

    updates = update_sheet(service, sid, sheet_name, col_idx, results)

    if updates:
        service.spreadsheets().values().batchUpdate(
            spreadsheetId=sid,
            body={"valueInputOption": "USER_ENTERED", "data": updates},
        ).execute()
        print(f"   ✅ {len(updates)}개 셀 업데이트 완료!")
    else:
        print("   ⚠️  업데이트할 데이터가 없습니다")


if __name__ == "__main__":
    main()
