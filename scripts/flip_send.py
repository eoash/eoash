#!/usr/bin/env python3
"""
EO Studio Flip - Signature Packet + 계약서 발송 스크립트

4종 투자자 유형:
  - institutional_kr : 기관투자자 (한국) — 서명 + 외국환서류 안내
  - institutional_us : 기관투자자 (미국) — 서명만
  - individual_resident : 개인 거주자 — 서명 + 외국환서류 안내
  - individual_nonresident : 개인 비거주자 — 서명만

Usage:
  python scripts/flip_send.py --dry-run                  # 발송 내용 미리보기
  python scripts/flip_send.py --send                     # 실제 발송 (확인 프롬프트 포함)
  python scripts/flip_send.py --send --target datable    # 특정 수신자만 발송
  python scripts/flip_send.py --send --test-to me@example.com  # 테스트 주소로 발송
  python scripts/flip_send.py --dry-run --list-ids       # 수신자 ID 목록
"""
import argparse
import base64
import sys
import zipfile
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

PROJECT_ROOT = Path(__file__).parent.parent
TOKEN_PATH = PROJECT_ROOT / "token_send.json"
INVESTORS_ZIP = PROJECT_ROOT / "flip_signature_investors.zip"
ZIP_INNER_DIR = "EO - PDF Signature Packets (Investors) /"
CONTRACT_DIR = PROJECT_ROOT / "docs" / "flip" / "EO - Flip Documents"

DEADLINE = "2026년 2월 27일(금)"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]

# 계약서 파일 목록 (이메일 첨부용)
CONTRACT_FILES = [
    "EO - Amended and Restated Certificate of Incorporation.docx",
    "EO - Common Stock Exchange Agreement.docx",
    "EO - Preferred Stock Exchange Agreement.docx",
    "EO - Investors' Rights Agreement.docx",
    "EO - Right of First Refusal and Co-Sale Agreement.docx",
    "EO - Voting Agreement.docx",
]

# ─────────────────────────────────────────────────────────────────────────────
# 수신자 설정
# email=None → --dry-run에서 표시, --send 시 자동 건너뜀
# ─────────────────────────────────────────────────────────────────────────────
RECIPIENTS = [
    # === 기관투자자 (한국) 7개사 ===
    {
        "id": "futureplay",
        "type": "institutional_kr",
        "name_kr": "(주)퓨처플레이",
        "name_en": "FuturePlay",
        "contact_name": "TBD",
        "email": None,
        "packet_file": "Signature Packet (FuturePlay).pdf",
    },
    {
        "id": "datable",
        "type": "institutional_kr",
        "name_kr": "㈜데이터블",
        "name_en": "Datable Inc.",
        "contact_name": "TBD",
        "email": None,
        "packet_file": "Signature Packet (Datable).pdf",
    },
    {
        "id": "base_dstring",
        "type": "institutional_kr",
        "name_kr": "베이스디스트링 벤처투자조합",
        "name_en": "Base Dstring",
        "contact_name": "TBD",
        "email": None,
        "packet_file": "Signature Packet (Base Dstring).pdf",
    },
    {
        "id": "base_metronome",
        "type": "institutional_kr",
        "name_kr": "베이스메트로놈 1호 벤처투자조합",
        "name_en": "Base Metronome",
        "contact_name": "TBD",
        "email": None,
        "packet_file": "Signature Packet (Base Metronome).pdf",
    },
    {
        "id": "next_company",
        "type": "institutional_kr",
        "name_kr": "네스트컴퍼니 개인투자조합 1호",
        "name_en": "Next Company",
        "contact_name": "TBD",
        "email": None,
        "packet_file": "Signature Packet (Next Company).pdf",
    },
    {
        "id": "cnt_tech_sports",
        "type": "institutional_kr",
        "name_kr": "씨엔티테크 제18호 스포츠스타트업 투자조합",
        "name_en": "CNT Tech Sports Startup",
        "contact_name": "TBD",
        "email": None,
        "packet_file": "Signature Packet (CNT Tech Sports Startup).pdf",
    },
    {
        "id": "ai_angel_cnt",
        "type": "institutional_kr",
        "name_kr": "에이아이엔젤-씨엔티테크 개인투자조합 2호",
        "name_en": "AI Angel - CNT Tech",
        "contact_name": "TBD",
        "email": None,
        "packet_file": "Signature Packet (AI Angel - CNT Tech).pdf",
    },
    # === 기관투자자 (미국) 1개사 ===
    {
        "id": "primer_sazze",
        "type": "institutional_us",
        "name_kr": "Primer Sazze Fund II, LP",
        "name_en": "Primer Sazze",
        "contact_name": "TBD",
        "email": None,
        "packet_file": "Signature Packet (Primer Sazze).pdf",
    },
    # === 개인 거주자 5명 ===
    {
        "id": "jae_sik_shin",
        "type": "individual_resident",
        "name_kr": "신재식",
        "name_en": "Jae Sik Shin",
        "email": None,
        "packet_file": "Signature Packet (Jae Sik Shin).pdf",
    },
    {
        "id": "sung_hun_kim",
        "type": "individual_resident",
        "name_kr": "김성훈",
        "name_en": "Sung Hun Kim",
        "email": None,
        "packet_file": "Signature Page (Sung Hun Kim).pdf",
    },
    {
        "id": "wonjun_chang",
        "type": "individual_resident",
        "name_kr": "장원준",
        "name_en": "Wonjun Chang",
        "email": None,
        "packet_file": "Signature Page (Wonjun Chang).pdf",
    },
    {
        "id": "hyungjoon_yang",
        "type": "individual_resident",
        "name_kr": "양형준",
        "name_en": "Hyungjoon Yang",
        "email": None,
        "packet_file": "Signature Page (Hyungjoon Yang).pdf",
    },
    {
        "id": "junyong_suh",
        "type": "individual_resident",
        "name_kr": "서준용",
        "name_en": "Junyong Suh",
        "email": None,
        "packet_file": "Signature Page (Junyong Suh).pdf",
        "note": "영주권자, 한국 거주 중 — 거주자 기준 적용",
    },
    # === 개인 비거주자 3명 ===
    {
        "id": "seungyoon_lee",
        "type": "individual_nonresident",
        "name_kr": "이승윤",
        "name_en": "Seungyoon Lee",
        "email": None,
        "packet_file": "Signature Page (Seungyoon Lee).pdf",
    },
    {
        "id": "sungmoon_cho",
        "type": "individual_nonresident",
        "name_kr": "조성문",
        "name_en": "Sungmoon Cho",
        "email": None,
        "packet_file": "Signature Page (Sungmoon Cho).pdf",
    },
    {
        "id": "keeyong_han",
        "type": "individual_nonresident",
        "name_kr": "한기용",
        "name_en": "Keeyong Han",
        "email": None,
        "packet_file": "Signature Page (Keeyong Han).pdf",
    },
]

# 유형별 이메일 제목
SUBJECTS = {
    "institutional_kr": "[EO Studio] 미국 법인 전환(Flip) - 서명 및 외국환서류 요청",
    "institutional_us": "[EO Studio] Flip Transaction - Signature Packet Request",
    "individual_resident": "[EO Studio] 미국 법인 전환(Flip) - 서명 및 외국환서류 요청",
    "individual_nonresident": "[EO Studio] Flip Transaction - Signature Page Request",
}

TYPE_LABELS = {
    "institutional_kr": "기관투자자(한국)",
    "institutional_us": "기관투자자(미국)",
    "individual_resident": "개인 거주자",
    "individual_nonresident": "개인 비거주자",
}


# ─────────────────────────────────────────────────────────────────────────────
# 이메일 본문 빌더 (4종)
# ─────────────────────────────────────────────────────────────────────────────

def build_body_institutional_kr(r: dict) -> str:
    return f"""\
안녕하세요,

EO Studio의 미국 법인 전환(이하 "플립") 절차가 마지막 단계에 들어왔습니다.
이번 이메일은 서명과 외국환신고 서류를 요청드리기 위한 것입니다.

[진행 상황]
- 기업가치평가 완료: 한국법인 주당 158원, 미국법인 주당 약 3원, 교환비율 1:52.66 확정
- 모든 계약서 확정 완료
- 현재: 주주 서명 수집 및 외국환신고 서류 준비 중

[앞으로의 절차]
- 주주 서명 수집 및 변호사 에스크로 보관 (현재)
- 한국 외국환신고 최종 수리
- 모든 조건 충족 시 Closing 및 주식 교환 실행

---

[요청 1] Signature Packet 서명 (첨부 파일)

첨부된 Signature Packet PDF에는 아래 5개 계약서의 서명 페이지가 포함되어 있습니다:

  1. Common Stock Exchange Agreement (보통주 교환 계약)
  2. Preferred Stock Exchange Agreement (우선주 교환 계약)
  3. Investors' Rights Agreement (투자자 권리 계약)
  4. Right of First Refusal and Co-Sale Agreement (우선 구매권 및 동반 판매 계약)
  5. Voting Agreement (의결권 계약)

각 계약서의 전문(Full Agreement)도 함께 첨부드리오니 참고해주세요.

서명 시 주의사항:
  - 법인 인감 또는 서명 권한자 인감을 사용해주세요
  - 날짜는 기입하지 마세요 (Closing Day에 미국 변호사가 자동 입력합니다)
  - 모든 페이지(5개 계약서 모두)에 서명이 필요합니다

---

[요청 2] 외국환신고 서류 (우편 제출)

한국 외국환거래법에 따른 증권취득신고를 위해 아래 서류가 필요합니다:

  1. 증권취득신고서 원본 2부 (별도 양식 발송 예정)
  2. 위임장 (법무법인 세움 위임용)
  3. 법인인감증명서 1부
  4. 사업자등록증 사본 1부
  5. 이사회의사록 (주식 교환 승인 관련)

※ 증권취득신고서 양식은 법무법인 세움에서 각 기관별로 별도 전달 예정입니다.

---

[제출 기한] {DEADLINE} 17:00 KST

서명 제출 방법:
  - 옵션 1 (권장): 서명 후 스캔하여 ash@eoeoeo.net으로 이메일 회신
  - 옵션 2: 원본 우편 발송 — 서울시 강남구 압구정로28길 9-2, 2층

문의:
  - EO Studio 안서현: ash@eoeoeo.net / 010-5382-2553
  - 미국 변호사 Eugene Kang: eugene@venturouscounsel.com
  - 한국 변호사 정호석 (법무법인 세움): hoseok.jung@seumlaw.com

감사합니다.

EO Studio
Finance Lead, Seohyun Ahn
ash@eoeoeo.net
Tel. 82+ 10 5382 2553
"""


def build_body_institutional_us(r: dict) -> str:
    return f"""\
안녕하세요,

EO Studio의 미국 법인 전환(이하 "플립") 절차가 마지막 단계에 들어왔습니다.
이번 이메일은 귀사의 서명을 요청드리기 위한 것입니다.

[진행 상황]
- 기업가치평가 완료: 교환비율 1:52.66 확정
- 모든 계약서 확정 완료
- 현재: 주주 서명 수집 중

[앞으로의 절차]
- 주주 서명 수집 및 변호사 에스크로 보관 (현재)
- 모든 조건 충족 시 Closing 및 주식 교환 실행

---

[요청] Signature Packet 서명 (첨부 파일)

첨부된 Signature Packet PDF에는 아래 5개 계약서의 서명 페이지가 포함되어 있습니다:

  1. Common Stock Exchange Agreement
  2. Preferred Stock Exchange Agreement
  3. Investors' Rights Agreement
  4. Right of First Refusal and Co-Sale Agreement
  5. Voting Agreement

각 계약서의 전문(Full Agreement)도 함께 첨부드립니다.

서명 시 주의사항:
  - Authorized signatory의 서명을 사용해주세요
  - 날짜는 기입하지 마세요 (Closing Day에 미국 변호사가 자동 입력합니다)
  - 모든 페이지(5개 계약서 모두)에 서명이 필요합니다

※ 비거주자(미국 소재 법인)로서 한국 외국환신고 서류는 별도로 필요하지 않습니다.

---

[제출 기한] {DEADLINE}

서명 후 스캔하여 ash@eoeoeo.net으로 이메일 회신 부탁드립니다.

문의:
  - EO Studio 안서현: ash@eoeoeo.net / 010-5382-2553
  - 미국 변호사 Eugene Kang: eugene@venturouscounsel.com

감사합니다.

EO Studio
Finance Lead, Seohyun Ahn
ash@eoeoeo.net
Tel. 82+ 10 5382 2553
"""


def build_body_individual_resident(r: dict) -> str:
    name_kr = r["name_kr"]
    return f"""\
안녕하세요 {name_kr}님,

EO Studio의 미국 법인 전환(Flip)을 진행 중입니다.
현재 주주님의 서명이 필요한 단계에 들어왔습니다.

[진행 상황]
- 기업가치평가 완료: 한국법인 주당 158원, 교환비율 1:52.66 확정
- 모든 계약서 확정
- 현재: 주주 서명 수집 및 외국환신고 서류 준비 중

[앞으로의 절차]
- 주주 서명 수집 및 변호사 에스크로 보관 (현재)
- 한국 외국환신고 수리
- 모든 조건 충족 시 Closing 및 주식 교환

---

[요청 1] Signature Page 서명 (첨부 파일)

첨부된 Signature Page PDF에 서명 부탁드립니다. 5개 계약서의 서명 페이지가 들어있습니다:

  1. Common Stock Exchange Agreement (보통주 교환 계약)
  2. Preferred Stock Exchange Agreement (우선주 교환 계약)
  3. Investors' Rights Agreement (투자자 권리 계약)
  4. Right of First Refusal and Co-Sale Agreement (우선 구매권 및 동반 판매 계약)
  5. Voting Agreement (의결권 계약)

각 계약서의 전문(Full Agreement)도 함께 첨부드리오니 참고해주세요.

서명 시 주의사항:
  - 인감이나 서명(흑색 볼펜)을 사용해주세요
  - 날짜는 기입하지 마세요 (Closing Day에 변호사가 자동 입력합니다)
  - 모든 페이지(5개 모두)에 서명이 필요합니다

---

[요청 2] 외국환신고 서류 (우편 제출)

한국 외국환거래법에 따른 증권취득신고를 위해 아래 서류가 필요합니다:

  1. 증권취득신고서 원본 2부 (별도 양식 발송 예정)
  2. 위임장 (법무법인 세움 위임용)
  3. 개인인감증명서 1부
  4. 신분증 사본 1부

※ 증권취득신고서 양식은 법무법인 세움에서 별도 전달 예정입니다.

---

[제출 기한] {DEADLINE} 17:00 KST

서명 제출 방법:
  - 옵션 1 (권장): 서명 후 스캔하여 ash@eoeoeo.net으로 이메일 회신
  - 옵션 2: 원본 우편 발송 — 서울시 강남구 압구정로28길 9-2, 2층
  - 옵션 3: 서명 후 사진 촬영하여 ash@eoeoeo.net으로 전송

문의:
  - EO Studio 안서현: ash@eoeoeo.net / 010-5382-2553
  - 미국 변호사 Eugene Kang: eugene@venturouscounsel.com
  - 한국 변호사 정호석 (법무법인 세움): hoseok.jung@seumlaw.com

감사합니다.

EO Studio
Finance Lead, Seohyun Ahn
ash@eoeoeo.net
Tel. 82+ 10 5382 2553
"""


def build_body_individual_nonresident(r: dict) -> str:
    name_kr = r["name_kr"]
    return f"""\
안녕하세요 {name_kr}님,

EO Studio의 미국 법인 전환(Flip)을 진행 중입니다.
현재 주주님의 서명이 필요한 단계에 들어왔습니다.

[진행 상황]
- 기업가치평가 완료: 교환비율 1:52.66 확정
- 모든 계약서 확정
- 현재: 주주 서명 수집 중

[앞으로의 절차]
- 주주 서명 수집 및 변호사 에스크로 보관 (현재)
- 모든 조건 충족 시 Closing 및 주식 교환

---

[요청] Signature Page 서명 (첨부 파일)

첨부된 Signature Page PDF에 서명 부탁드립니다. 5개 계약서의 서명 페이지가 들어있습니다:

  1. Common Stock Exchange Agreement (보통주 교환 계약)
  2. Preferred Stock Exchange Agreement (우선주 교환 계약)
  3. Investors' Rights Agreement (투자자 권리 계약)
  4. Right of First Refusal and Co-Sale Agreement (우선 구매권 및 동반 판매 계약)
  5. Voting Agreement (의결권 계약)

각 계약서의 전문(Full Agreement)도 함께 첨부드립니다.

서명 시 주의사항:
  - 서명(검정 펜)을 사용해주세요
  - 날짜는 기입하지 마세요 (Closing Day에 변호사가 자동 입력합니다)
  - 모든 페이지(5개 모두)에 서명이 필요합니다

※ 비거주자로서 한국 외국환신고 서류는 별도로 필요하지 않습니다.

---

[제출 기한] {DEADLINE}

서명 후 스캔하여 ash@eoeoeo.net으로 이메일 회신 부탁드립니다.

문의:
  - EO Studio 안서현: ash@eoeoeo.net / 010-5382-2553
  - 미국 변호사 Eugene Kang: eugene@venturouscounsel.com

감사합니다.

EO Studio
Finance Lead, Seohyun Ahn
ash@eoeoeo.net
Tel. 82+ 10 5382 2553
"""


BODY_BUILDERS = {
    "institutional_kr": build_body_institutional_kr,
    "institutional_us": build_body_institutional_us,
    "individual_resident": build_body_individual_resident,
    "individual_nonresident": build_body_individual_nonresident,
}


# ─────────────────────────────────────────────────────────────────────────────
# Gmail / 첨부 / 발송
# ─────────────────────────────────────────────────────────────────────────────

def get_gmail_service():
    """Gmail API 서비스 초기화"""
    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
        else:
            print(f"토큰 없음 또는 만료. {TOKEN_PATH} 확인 후 재인증 필요.")
            sys.exit(1)
    return build("gmail", "v1", credentials=creds)


def load_pdf_from_zip(zip_path: Path, filename: str) -> bytes | None:
    """ZIP에서 특정 PDF 파일을 메모리로 로드"""
    if not zip_path.exists():
        return None
    with zipfile.ZipFile(zip_path) as z:
        target = ZIP_INNER_DIR + filename
        if target in z.namelist():
            return z.read(target)
        # ZIP_INNER_DIR 없이도 시도
        if filename in z.namelist():
            return z.read(filename)
    return None


def load_contract_files() -> list[tuple[str, bytes]]:
    """계약서 docx 파일들을 로드하여 (filename, bytes) 리스트로 반환"""
    contracts = []
    for fname in CONTRACT_FILES:
        fpath = CONTRACT_DIR / fname
        if fpath.exists():
            contracts.append((fname, fpath.read_bytes()))
    return contracts


def build_email_message(
    recipient: dict,
    pdf_bytes: bytes,
    contract_files: list[tuple[str, bytes]],
    override_to: str | None = None,
) -> MIMEMultipart:
    """첨부 파일 포함 MIME 이메일 메시지 생성"""
    msg = MIMEMultipart()
    msg["To"] = override_to or recipient["email"]
    msg["From"] = "ash@eoeoeo.net"
    msg["Subject"] = SUBJECTS[recipient["type"]]

    body_fn = BODY_BUILDERS[recipient["type"]]
    msg.attach(MIMEText(body_fn(recipient), "plain", "utf-8"))

    # 1) Signature Packet/Page PDF
    att_pdf = MIMEApplication(pdf_bytes, _subtype="pdf")
    att_pdf.add_header(
        "Content-Disposition", "attachment", filename=recipient["packet_file"]
    )
    msg.attach(att_pdf)

    # 2) 계약서 docx 파일들
    for fname, fbytes in contract_files:
        att_doc = MIMEApplication(
            fbytes,
            _subtype="vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        att_doc.add_header("Content-Disposition", "attachment", filename=fname)
        msg.attach(att_doc)

    return msg


def send_email(service, msg: MIMEMultipart) -> dict:
    """Gmail API를 통해 이메일 발송"""
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    return (
        service.users()
        .messages()
        .send(userId="me", body={"raw": raw})
        .execute()
    )


def print_dry_run_entry(recipient: dict, pdf_found: bool, contract_count: int):
    """Dry-run 시 수신자별 미리보기 출력"""
    email_str = recipient.get("email") or "TBD (이메일 미확인)"
    send_status = (
        "[발송 예정]" if recipient.get("email") else "[건너뜀 - 이메일 TBD]"
    )
    pdf_status = "PDF 확인" if pdf_found else "PDF 없음(!)"
    type_label = TYPE_LABELS.get(recipient["type"], recipient["type"])
    note = recipient.get("note", "")

    print(f"\n{'─' * 60}")
    print(f"  이름:   {recipient['name_kr']} ({recipient['name_en']})")
    print(f"  유형:   {type_label}")
    print(f"  이메일: {email_str}")
    print(f"  상태:   {send_status}")
    print(f"  첨부:   {recipient['packet_file']} [{pdf_status}] + 계약서 {contract_count}개")
    if note:
        print(f"  비고:   {note}")


# ─────────────────────────────────────────────────────────────────────────────
# main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="EO Studio Flip - Signature Packet + 계약서 이메일 발송",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
예시:
  python scripts/flip_send.py --dry-run                      # 전체 미리보기
  python scripts/flip_send.py --send                         # 실제 발송
  python scripts/flip_send.py --send --target datable        # 데이터블만 발송
  python scripts/flip_send.py --send --test-to me@test.com   # 테스트 주소로 발송
  python scripts/flip_send.py --dry-run --list-ids           # 수신자 ID 목록
""",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--dry-run", action="store_true", help="발송 내용 미리보기 (실제 발송 없음)"
    )
    group.add_argument(
        "--send", action="store_true", help="실제 발송 (확인 프롬프트 포함)"
    )
    parser.add_argument(
        "--target", default="all", metavar="ID", help="특정 수신자 ID (기본: all)"
    )
    parser.add_argument(
        "--test-to",
        metavar="EMAIL",
        help="테스트용 이메일 주소 — 모든 메일을 이 주소로 발송",
    )
    parser.add_argument(
        "--list-ids", action="store_true", help="수신자 ID 목록 출력 후 종료"
    )
    parser.add_argument(
        "--no-contracts",
        action="store_true",
        help="계약서 docx 첨부 생략 (Signature Packet만 발송)",
    )
    args = parser.parse_args()

    # ─── ID 목록 ───
    if args.list_ids:
        print(f"\n{'ID':<22} {'유형':<18} {'이름':<25} {'이메일'}")
        print(f"{'─' * 22} {'─' * 18} {'─' * 25} {'─' * 30}")
        for r in RECIPIENTS:
            email_str = r.get("email") or "(TBD)"
            type_label = TYPE_LABELS.get(r["type"], r["type"])
            print(f"{r['id']:<22} {type_label:<18} {r['name_kr']:<25} {email_str}")
        return

    # 대상 필터링
    if args.target == "all":
        targets = RECIPIENTS
    else:
        targets = [r for r in RECIPIENTS if r["id"] == args.target]
        if not targets:
            print(f"\n수신자 '{args.target}'를 찾을 수 없습니다.")
            print("--list-ids 옵션으로 사용 가능한 ID를 확인하세요.")
            sys.exit(1)

    # 계약서 파일 로드
    contract_files = [] if args.no_contracts else load_contract_files()
    contract_count = len(contract_files)
    if not args.no_contracts and contract_count == 0:
        print(f"\n[경고] 계약서 파일을 찾을 수 없습니다: {CONTRACT_DIR}")
        print("--no-contracts 옵션으로 계약서 없이 발송하거나, 파일 경로를 확인하세요.")
        sys.exit(1)

    # ─── DRY-RUN ───
    if args.dry_run:
        print(f"\n[DRY-RUN 모드] 실제 발송하지 않습니다.")
        print(f"[계약서] {contract_count}개 파일 {'첨부 예정' if contract_count else '(생략)'}")

        total = len(targets)
        ready = sum(1 for r in targets if r.get("email"))
        tbd = total - ready

        # 유형별 카운트
        type_counts = {}
        for r in targets:
            label = TYPE_LABELS.get(r["type"], r["type"])
            type_counts[label] = type_counts.get(label, 0) + 1

        for r in targets:
            pdf_bytes = load_pdf_from_zip(INVESTORS_ZIP, r["packet_file"])
            print_dry_run_entry(r, pdf_bytes is not None, contract_count)

        print(f"\n{'=' * 60}")
        print(f"[요약] 총 {total}명 | 발송 가능: {ready}명 | 이메일 미확인: {tbd}명")
        print(f"[유형] {' | '.join(f'{k}: {v}명' for k, v in type_counts.items())}")
        print(f"[기한] {DEADLINE}")

        if tbd > 0:
            print(f"\n[이메일 확인 필요]")
            for r in targets:
                if not r.get("email"):
                    label = TYPE_LABELS.get(r["type"], r["type"])
                    contact = r.get("contact_name", "")
                    extra = f", 담당: {contact}" if contact and contact != "TBD" else ""
                    print(f"  - [{label}] {r['name_kr']}  (ID: {r['id']}{extra})")
        return

    # ─── 실제 발송 ───
    if args.test_to:
        ready_targets = targets  # --test-to 시 이메일 없어도 발송 가능
    else:
        ready_targets = [r for r in targets if r.get("email")]

    skip_targets = [r for r in targets if r not in ready_targets]

    if not ready_targets:
        print("\n발송 가능한 수신자가 없습니다 (이메일 모두 TBD).")
        print("RECIPIENTS에 이메일 주소를 입력하거나 --test-to 옵션을 사용하세요.")
        sys.exit(0)

    # 확인 프롬프트
    if args.test_to:
        print(f"\n[테스트 모드] 모든 메일을 {args.test_to}로 발송합니다.")
    print(f"[대상] {len(ready_targets)}명에게 발송 예정:")
    for r in ready_targets:
        to_addr = args.test_to or r["email"]
        label = TYPE_LABELS.get(r["type"], r["type"])
        print(f"  - {r['name_kr']} ({label}) → {to_addr}")
    if skip_targets:
        print(f"[건너뜀] {len(skip_targets)}명 (이메일 TBD)")

    confirm = input(f"\n정말 발송하시겠습니까? (yes/no): ").strip().lower()
    if confirm != "yes":
        print("발송을 취소했습니다.")
        return

    print("\n[Gmail 인증 중...]")
    service = get_gmail_service()
    print("[인증 완료]\n")

    sent_count = 0
    fail_count = 0

    for r in ready_targets:
        to_addr = args.test_to or r["email"]
        print(f"  발송 중: {r['name_kr']} → {to_addr} ...", end=" ", flush=True)

        pdf_bytes = load_pdf_from_zip(INVESTORS_ZIP, r["packet_file"])
        if pdf_bytes is None:
            print(f"[실패] PDF 없음: {r['packet_file']}")
            fail_count += 1
            continue

        msg = build_email_message(r, pdf_bytes, contract_files, override_to=args.test_to)
        result = send_email(service, msg)
        print(f"[완료] ID: {result['id']}")
        sent_count += 1

    print(
        f"\n[발송 완료] 성공: {sent_count}건 | 실패: {fail_count}건"
        f" | 건너뜀(TBD): {len(skip_targets)}건"
    )


if __name__ == "__main__":
    main()
