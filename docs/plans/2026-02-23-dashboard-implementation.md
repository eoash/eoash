# EO Studio 매출 대시보드 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Google Sheets 기반 EO Studio 매출 대시보드를 Streamlit 멀티페이지로 구현한다.

**Architecture:** Google Sheets API로 데이터를 읽어 pandas DataFrame으로 변환하고, Streamlit + Plotly로 시각화한다. 데이터 로딩은 utils/sheets.py에 집중하고, 5분 캐싱으로 API 호출을 최소화한다.

**Tech Stack:** Streamlit, Plotly, Pandas, google-api-python-client

---

### Task 1: 프로젝트 셋업 & 의존성 설치

**Files:**
- Create: `dashboard/__init__.py`
- Create: `dashboard/utils/__init__.py`
- Create: `dashboard/pages/.gitkeep`

**Step 1: 디렉토리 구조 생성**

```bash
mkdir -p dashboard/pages dashboard/utils
touch dashboard/__init__.py dashboard/utils/__init__.py
```

**Step 2: 의존성 설치**

```bash
pip install streamlit plotly pandas
```

**Step 3: 설치 확인**

Run: `python -c "import streamlit; import plotly; print('OK')"`
Expected: `OK`

**Step 4: 커밋**

```bash
git add dashboard/
git commit -m "chore: dashboard 프로젝트 구조 생성"
```

---

### Task 2: utils/sheets.py — 데이터 로딩 모듈

**Files:**
- Create: `dashboard/utils/sheets.py`

**Step 1: 기본 인증 & 시트 읽기 함수 작성**

```python
import os
import re
import streamlit as st
import pandas as pd
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TOKEN_FILE = os.path.join(BASE_DIR, 'token_sheets.json')
SPREADSHEET_ID = '1Vw4_IszfjrxGa1z51LZ2WmvJ71I5eWPghR-uSr3f0pM'
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
]


def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return build('sheets', 'v4', credentials=creds)


def read_range(service, sheet_name, range_str):
    r = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"'{sheet_name}'!{range_str}"
    ).execute()
    return r.get('values', [])


def parse_money(val):
    """'₩141,753,433 ' 또는 '1,611,557' 또는 '(₩239,719,883)' → int"""
    if not val or val in ('#DIV/0!', '#REF!', '#N/A', ''):
        return 0
    s = str(val).strip()
    negative = s.startswith('(') or s.startswith('-')
    s = re.sub(r'[₩$,\s()]', '', s)
    try:
        n = int(float(s))
        return -n if negative else n
    except ValueError:
        return 0
```

**Step 2: 매출 데이터 로딩 함수**

```python
@st.cache_data(ttl=300)
def load_revenue_2026():
    """2026 매출 시트 → BU별 소계 DataFrame"""
    service = get_service()
    rows = read_range(service, '2026 매출', 'A1:T50')

    bus = []  # [{'bu': ..., 'category': ..., '1월': ..., ...}]
    current_bu = ''
    for row in rows:
        if len(row) < 3:
            continue
        # BU 이름 감지 (2번째 컬럼에 값이 있으면 새 BU)
        if row[1].strip():
            current_bu = row[1].strip()
        cat = row[2].strip() if len(row) > 2 else ''
        if not cat or cat in ('인원수', '인당 매출'):
            continue
        months = {}
        for i, m in enumerate(['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'], start=3):
            months[m] = parse_money(row[i] if i < len(row) else '0')
        total = parse_money(row[15] if len(row) > 15 else '0')
        target = parse_money(row[16] if len(row) > 16 else '0')
        bus.append({
            'BU': current_bu,
            '카테고리': cat,
            **months,
            '합계': total,
            '목표': target,
        })
    return pd.DataFrame(bus)


@st.cache_data(ttl=300)
def load_revenue_comparison():
    """매출비교 시트 → 연도별 DataFrame"""
    service = get_service()
    rows = read_range(service, '매출비교', 'A1:R20')

    data = []
    for row in rows:
        if len(row) < 3:
            continue
        label = row[1].strip() if len(row) > 1 else ''
        if '매출액' not in label and '매출' not in label:
            continue
        if '차액' in label:
            continue
        months = {}
        for i, m in enumerate(['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'], start=2):
            months[m] = parse_money(row[i] if i < len(row) else '0')
        total = parse_money(row[14] if len(row) > 14 else '0')
        headcount = parse_money(row[15] if len(row) > 15 else '0')
        data.append({
            '연도': label,
            **months,
            '합계': total,
            '인원수': headcount,
        })
    return pd.DataFrame(data)
```

**Step 3: Cash Position 로딩 함수**

```python
@st.cache_data(ttl=300)
def load_cash_position():
    """2026 Cash Position Summary → DataFrame"""
    service = get_service()
    rows = read_range(service, '2026 Cash Position Summary', 'A1:Z20')

    # 헤더에서 월 컬럼 추출
    header = rows[0] if rows else []
    months = [h for h in header[3:] if h.strip()]

    data = []
    current_entity = ''
    for row in rows[1:]:
        if len(row) < 3:
            continue
        if row[1].strip():
            current_entity = row[1].strip()
        metric = row[2].strip() if len(row) > 2 else ''
        if not metric:
            continue
        entry = {'entity': current_entity, 'metric': metric}
        for i, m in enumerate(months):
            entry[m] = parse_money(row[3 + i] if 3 + i < len(row) else '0')
        data.append(entry)
    return pd.DataFrame(data)
```

**Step 4: AR 미수금 로딩 함수**

```python
@st.cache_data(ttl=300)
def load_ar():
    """거래처별 미수금 → DataFrame"""
    service = get_service()
    rows = read_range(service, '거래처별 미수금/회수기간 관리표', 'A1:N500')

    data = []
    for row in rows:
        if len(row) < 10:
            continue
        if row[4].strip() != 'Actual':
            continue
        month = row[5].strip() if len(row) > 5 else ''
        company = row[6].strip() if len(row) > 6 else ''
        amount = parse_money(row[8] if len(row) > 8 else '0')
        item = row[9].strip() if len(row) > 9 else ''
        issue_date = row[10].strip() if len(row) > 10 else ''
        settle_date = row[11].strip() if len(row) > 11 else ''
        days = parse_money(row[12] if len(row) > 12 else '0')
        if not company:
            continue
        data.append({
            '월': month,
            '거래처': company,
            '공급가액': amount,
            '품목': item,
            '발행일': issue_date,
            '정산일': settle_date,
            '회수일수': days,
        })
    return pd.DataFrame(data)
```

**Step 5: 동작 확인**

Run: `python -c "import sys; sys.path.insert(0,'.'); from dashboard.utils.sheets import load_revenue_comparison; print('OK')"`
Expected: `OK`

**Step 6: 커밋**

```bash
git add dashboard/utils/sheets.py
git commit -m "feat: 구글시트 데이터 로딩 모듈 (매출/현금/AR)"
```

---

### Task 3: app.py — 홈 (Overview) 페이지

**Files:**
- Create: `dashboard/app.py`

**Step 1: 홈 페이지 작성**

```python
import streamlit as st
from utils.sheets import load_revenue_2026, load_cash_position, load_ar

st.set_page_config(
    page_title="EO Studio 대시보드",
    page_icon="📊",
    layout="wide",
)

# 사이드바
with st.sidebar:
    st.title("EO Studio")
    if st.button("🔄 새로고침"):
        st.cache_data.clear()
        st.rerun()

st.title("📊 EO Studio 매출 대시보드")

# 데이터 로딩
revenue = load_revenue_2026()
cash = load_cash_position()
ar = load_ar()

# KPI 카드 4개
subtotals = revenue[revenue['카테고리'] == '소계']
ytd_total = subtotals['합계'].sum()
target_total = subtotals['목표'].sum()
achievement = (ytd_total / target_total * 100) if target_total > 0 else 0

cash_total = cash[(cash['entity'].str.contains('Total')) & (cash['metric'] == 'Balance')]
latest_cash_col = [c for c in cash.columns if c.startswith('2026')][-1] if any(c.startswith('2026') for c in cash.columns) else None
cash_balance = cash_total[latest_cash_col].values[0] if latest_cash_col and len(cash_total) > 0 else 0

ar_total = ar['공급가액'].sum()
unsettled = ar[ar['정산일'] == '']['공급가액'].sum()

c1, c2, c3, c4 = st.columns(4)
c1.metric("2026 YTD 매출", f"₩{ytd_total:,.0f}")
c2.metric("목표 달성률", f"{achievement:.1f}%")
c3.metric("Cash Position", f"₩{cash_balance:,.0f}")
c4.metric("미회수 AR", f"₩{unsettled:,.0f}")

# 최근 월별 매출 미니 차트
st.subheader("월별 매출 추이")
import plotly.graph_objects as go
months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
monthly = [subtotals[m].sum() for m in months]

fig = go.Figure()
fig.add_trace(go.Bar(x=months, y=monthly, marker_color='#4A90D9'))
fig.update_layout(height=300, margin=dict(l=20,r=20,t=20,b=20))
st.plotly_chart(fig, use_container_width=True)
```

**Step 2: 실행 확인**

Run: `streamlit run dashboard/app.py`
Expected: 브라우저에 KPI 카드 4개 + 월별 막대 차트 표시

**Step 3: 커밋**

```bash
git add dashboard/app.py
git commit -m "feat: 대시보드 홈 페이지 (KPI 카드 + 월별 차트)"
```

---

### Task 4: pages/1_매출.py — 매출 분석 페이지

**Files:**
- Create: `dashboard/pages/1_매출.py`

**Step 1: 매출 분석 페이지 작성**

- 월별 실적 vs 목표 Grouped Bar Chart
- BU별 매출 비중 Pie Chart
- 2024~2026 연도별 추이 Line Chart (매출비교 시트 사용)

**Step 2: 실행 확인**

Run: `streamlit run dashboard/app.py` → 사이드바에서 "매출" 클릭
Expected: 차트 3개 정상 표시

**Step 3: 커밋**

```bash
git add dashboard/pages/1_매출.py
git commit -m "feat: 매출 분석 페이지 (목표 비교/BU 비중/연도 추이)"
```

---

### Task 5: pages/2_현금.py — Cash Position 페이지

**Files:**
- Create: `dashboard/pages/2_현금.py`

**Step 1: 현금 페이지 작성**

- 국가별 Balance 카드 (한국/미국/베트남)
- 월별 유입/유출 Grouped Bar Chart
- Total 잔액 추이 Line Chart

**Step 2: 실행 확인**

Run: `streamlit run dashboard/app.py` → 사이드바에서 "현금" 클릭
Expected: 카드 3개 + 차트 2개

**Step 3: 커밋**

```bash
git add dashboard/pages/2_현금.py
git commit -m "feat: Cash Position 페이지 (국가별 잔액/유입유출)"
```

---

### Task 6: pages/3_AR.py — 미수금 관리 페이지

**Files:**
- Create: `dashboard/pages/3_AR.py`

**Step 1: AR 페이지 작성**

- 전체 미수금 합계 + 미회수 합계 Metric 카드
- 거래처별 미수금 테이블 (금액 내림차순, 정산 여부 색상 표시)
- 회수일수 분포 히스토그램

**Step 2: 실행 확인**

Run: `streamlit run dashboard/app.py` → 사이드바에서 "AR" 클릭
Expected: 카드 + 테이블 + 히스토그램

**Step 3: 커밋**

```bash
git add dashboard/pages/3_AR.py
git commit -m "feat: AR 미수금 관리 페이지 (테이블/회수일수 분석)"
```

---

### Task 7: 통합 테스트 & 마무리

**Step 1: 전체 실행 확인**

Run: `streamlit run dashboard/app.py`
- 홈 → KPI 4개 + 월별 차트 확인
- 매출 → 차트 3개 확인
- 현금 → 카드 3개 + 차트 2개 확인
- AR → 테이블 + 히스토그램 확인
- 새로고침 버튼 → 데이터 재로딩 확인

**Step 2: 최종 커밋**

```bash
git add -A dashboard/
git commit -m "feat: EO Studio 매출 대시보드 완성 (매출/현금/AR)"
```
