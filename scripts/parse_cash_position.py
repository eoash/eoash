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
from datetime import datetime, date
from pathlib import Path
from urllib.request import urlopen

import pandas as pd

warnings.filterwarnings("ignore")

# ─── 파서들 ──────────────────────────────────────

def parse_clobe(filepath, year=None, month=None):
    """Clobe.ai 엑셀 → 한국 법인 합산 (KRW)

    year/month 지정 시 '통합 라벨링 내역'에서 해당 월만 필터.
    잔액은 '계좌' 시트의 기말잔액(=현재 잔액) 사용.
    """
    df_acct = pd.read_excel(filepath, sheet_name="계좌")
    header_idx = None
    for i, row in df_acct.iterrows():
        vals = [str(v).strip() for v in row.values if pd.notna(v)]
        if "기초 잔액" in vals or "기초잔액" in vals:
            header_idx = i
            break

    if header_idx is None:
        raise ValueError("Clobe 파일에서 헤더를 찾을 수 없습니다")

    total_idx = None
    for i in range(header_idx + 1, len(df_acct)):
        vals = [str(v).strip() for v in df_acct.iloc[i].values if pd.notna(v)]
        if "합계" in vals:
            total_idx = i
            break

    if total_idx is None:
        raise ValueError("Clobe 파일에서 합계 행을 찾을 수 없습니다")

    row = df_acct.iloc[total_idx]
    values = [v for v in row.values if pd.notna(v)]
    nums = [v for v in values if isinstance(v, (int, float))]

    if len(nums) < 4:
        raise ValueError(f"Clobe 합계 행 파싱 실패: {values}")

    balance = int(nums[-1])  # 기말잔액 (현재 잔액)

    # 월별 필터링: 통합 라벨링 내역에서 해당 월 입출금만 집계
    if year and month:
        try:
            df_txn = pd.read_excel(filepath, sheet_name="통합 라벨링 내역")
            df_txn["입금"] = pd.to_numeric(df_txn["입금"], errors="coerce").fillna(0)
            df_txn["출금"] = pd.to_numeric(df_txn["출금"], errors="coerce").fillna(0)
            df_txn["거래 월"] = pd.to_numeric(df_txn["거래 월"], errors="coerce")
            df_txn["거래 연도"] = pd.to_numeric(df_txn["거래 연도"], errors="coerce")
            mask = (df_txn["거래 연도"] == year) & (df_txn["거래 월"] == month)
            filtered = df_txn[mask]
            inflows = int(filtered["입금"].sum())
            outflows = int(filtered["출금"].sum())

            # 월말 잔액 역산: 현재 잔액에서 이후 월 거래를 되돌림
            after_mask = (df_txn["거래 연도"] == year) & (df_txn["거래 월"] > month)
            after = df_txn[after_mask]
            after_net = int(after["입금"].sum()) - int(after["출금"].sum())
            balance = balance - after_net  # 현재잔액 - 이후월순변동 = 해당월말잔액
        except Exception:
            inflows = int(nums[1])
            outflows = int(nums[2])
    else:
        inflows = int(nums[1])
        outflows = int(nums[2])

    return {
        "region": "Korea",
        "currency": "KRW",
        "balance": balance,
        "inflows": inflows,
        "outflows": outflows,
        "net_change": inflows - outflows,
    }


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
    overall_first_balance = 0  # 파일 내 가장 최근 잔액 (최신순 정렬 기준)

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

        # 파일 첫 번째 잔액 = 가장 최근 잔액 (최신순 정렬)
        if overall_first_balance == 0:
            overall_first_balance = bal

        # year, month가 전달되면 필터링
        if year and month:
            if txn_date.year != year or txn_date.month != month:
                continue

        total_out += out_amt
        total_in += in_amt
        if last_balance == 0:
            last_balance = bal  # 해당 월 가장 최근 잔액

    # 해당 월 거래가 없으면 파일 내 가장 최근 잔액으로 폴백
    if last_balance == 0:
        last_balance = overall_first_balance

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

    Inflows/Outflows만 숫자로 입력. Balance/Net Change/합산은 시트 수식에 맡김.
    data keys: korea, chase, hanmi, vietnam
    """
    c = col_letter(col_idx)

    updates = []
    kr = data.get("korea")
    ch = data.get("chase")
    hm = data.get("hanmi")
    vn = data.get("vietnam")

    # Korea (KRW) — Row 3 Inflows, Row 4 Outflows (Row 2 Balance, Row 5 Net = 수식)
    if kr:
        updates.append({"range": f"'{sheet_name}'!{c}3", "values": [[kr["inflows"]]]})
        updates.append({"range": f"'{sheet_name}'!{c}4", "values": [[kr["outflows"]]]})

    # U.S. 합산 (Row 18~21) — 수식 (=Chase+Hanmi), 건드리지 않음

    # Chase Bank — Row 25 Inflows, Row 26 Outflows (Row 24 Balance, Row 27 Net = 수식)
    if ch:
        updates.append({"range": f"'{sheet_name}'!{c}25", "values": [[ch["inflows"]]]})
        updates.append({"range": f"'{sheet_name}'!{c}26", "values": [[ch["outflows"]]]})

    # Hanmi Bank — Row 30 Inflows, Row 31 Outflows (Row 29 Balance, Row 31 Net = 수식)
    if hm:
        updates.append({"range": f"'{sheet_name}'!{c}30", "values": [[hm["inflows"]]]})
        updates.append({"range": f"'{sheet_name}'!{c}31", "values": [[hm["outflows"]]]})

    # Vietnam — Row 33~36은 합산 수식 (=Operating+Saving)
    # Operating Account — Row 40 Inflows, Row 41 Outflows (Row 39 Balance, Row 42 Net = 수식)
    if vn:
        updates.append({"range": f"'{sheet_name}'!{c}40", "values": [[vn["inflows"]]]})
        updates.append({"range": f"'{sheet_name}'!{c}41", "values": [[vn["outflows"]]]})

    return updates


# ─── 환율 ──────────────────────────────────────

def fetch_exchange_rate(year, month):
    """fawazahmed0/currency-api에서 월말 환율 조회.

    현재 월이면 최신(latest), 과거 월이면 말일 기준.
    Returns: (usd_krw, vnd_to_krw)
    """
    today = date.today()
    target = date(year, month, 1)

    if target.year == today.year and target.month == today.month:
        date_str = "latest"
    else:
        # 월말 날짜 계산
        if month == 12:
            last_day = date(year, 12, 31)
        else:
            last_day = date(year, month + 1, 1) - __import__("datetime").timedelta(days=1)
        date_str = last_day.strftime("%Y-%m-%d")

    url = f"https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{date_str}/v1/currencies/usd.json"
    try:
        with urlopen(url) as resp:
            data = json.loads(resp.read().decode())
        usd = data.get("usd", {})
        usd_krw = round(usd.get("krw", 0), 2)
        usd_vnd = usd.get("vnd", 1)
        vnd_to_krw = round(usd_krw / usd_vnd, 6) if usd_vnd else 0
        return usd_krw, vnd_to_krw
    except Exception as e:
        print(f"   ⚠️  환율 API 조회 실패: {e}")
        return None, None


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
        results["korea"] = parse_clobe(filepath, year, month)
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

    # 환율 조회 (dry-run에서도 표시)
    usd_krw, vnd_to_krw = fetch_exchange_rate(year, month)
    if usd_krw:
        print(f"   💱 USD/KRW: {usd_krw:,.2f}")
    if vnd_to_krw:
        print(f"   💱 VND→KRW: {vnd_to_krw}")

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

    # 환율 자동 입력 (위에서 이미 조회한 값 재사용)
    c = col_letter(col_idx)
    if usd_krw:
        updates.append({"range": f"'{sheet_name}'!{c}22", "values": [[usd_krw]]})
    if vnd_to_krw:
        updates.append({"range": f"'{sheet_name}'!{c}37", "values": [[vnd_to_krw]]})

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
