"""
EO Studio Flip - Signature Packet 이메일 발송 스크립트

사용법:
  python flip_send_packets.py                           # dry-run: 발송 내용 미리보기
  python flip_send_packets.py --to datable              # 특정 수신자만 dry-run
  python flip_send_packets.py --test-to ash@eoeoeo.net  # 본인에게 첨부파일 테스트 발송
  python flip_send_packets.py --send                    # 실제 발송 (확인 프롬프트 있음)
  python flip_send_packets.py --to datable --send       # 특정 수신자만 실제 발송

주의:
  --send 없이는 절대로 실제 메일이 발송되지 않습니다.
  --send 실행 시 수신자 목록을 보여주고 'SEND' 입력을 요구합니다.
  테스트 발송은 --test-to 옵션을 사용하세요. (--send 불필요)
  수신자 이메일 미입력 항목(FIXME)은 발송에서 자동 제외됩니다.
"""

import argparse
import base64
import sys
import tempfile
import zipfile
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# ─────────────────────────────────────────────
# 경로 설정
# ─────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent.parent
TOKEN_PATH = PROJECT_ROOT / "token_send.json"
CREDS_PATH = PROJECT_ROOT / "credentials.json"
INVESTORS_ZIP = PROJECT_ROOT / "flip_signature_investors.zip"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]

ZIP_PREFIX = "EO - PDF Signature Packets (Investors) /"

# ─────────────────────────────────────────────
# 수신자 목록
# 이메일이 FIXME로 되어 있으면 발송 제외됨
# ─────────────────────────────────────────────
RECIPIENTS = [
    # ── 기관 투자자 (Signature Packet) ──────────────────────────────
    {
        "key": "datable",
        "name": "Jong Dae Lee",
        "org": "Datable Inc.",
        "email": "jongdae.lee@datable.co.kr",
        "type": "institutional",
        "pdf": "Signature Packet (Datable).pdf",
    },
    {
        "key": "futureplay",
        "name": "담당자",
        "org": "FuturePlay",
        "email": "FIXME",  # 이메일 확인 필요
        "type": "institutional",
        "pdf": "Signature Packet (FuturePlay).pdf",
    },
    {
        "key": "base_metronome",
        "name": "담당자",
        "org": "Base Metronome",
        "email": "FIXME",  # 이메일 확인 필요
        "type": "institutional",
        "pdf": "Signature Packet (Base Metronome).pdf",
    },
    {
        "key": "base_dstring",
        "name": "담당자",
        "org": "Base Dstring",
        "email": "FIXME",  # 이메일 확인 필요
        "type": "institutional",
        "pdf": "Signature Packet (Base Dstring).pdf",
    },
    {
        "key": "next_company",
        "name": "담당자",
        "org": "Next Company",
        "email": "FIXME",  # 이메일 확인 필요
        "type": "institutional",
        "pdf": "Signature Packet (Next Company).pdf",
    },
    {
        "key": "primer_sazze",
        "name": "담당자",
        "org": "Primer Sazze",
        "email": "FIXME",  # 이메일 확인 필요
        "type": "institutional",
        "pdf": "Signature Packet (Primer Sazze).pdf",
    },
    {
        "key": "cnt_tech_sports",
        "name": "이태린 팀장",
        "org": "CNT Tech Sports Startup",
        "email": "FIXME",  # 이메일 확인 필요
        "type": "institutional",
        "pdf": "Signature Packet (CNT Tech Sports Startup).pdf",
    },
    {
        "key": "ai_angel_cnt",
        "name": "담당자",
        "org": "AI Angel - CNT Tech",
        "email": "FIXME",  # 이메일 확인 필요
        "type": "institutional",
        "pdf": "Signature Packet (AI Angel - CNT Tech).pdf",
    },
    {
        "key": "jae_sik_shin",
        "name": "신재식",
        "org": "신재식 (개인)",
        "email": "FIXME",  # 이메일 확인 필요
        "type": "institutional",
        "pdf": "Signature Packet (Jae Sik Shin).pdf",
    },
    # ── 개인 투자자 (Signature Page) ────────────────────────────────
    {
        "key": "wonjun_chang",
        "name": "장원준",
        "org": None,
        "email": "FIXME",  # 이메일 확인 필요
        "type": "individual",
        "pdf": "Signature Page (Wonjun Chang).pdf",
    },
    {
        "key": "sung_hun_kim",
        "name": "김성훈",
        "org": None,
        "email": "FIXME",  # 이메일 확인 필요
        "type": "individual",
        "pdf": "Signature Page (Sung Hun Kim).pdf",
    },
    {
        "key": "keeyong_han",
        "name": "한기용",
        "org": None,
        "email": "FIXME",  # 이메일 확인 필요 (비거주자)
        "type": "individual",
        "pdf": "Signature Page (Keeyong Han).pdf",
    },
    {
        "key": "sungmoon_cho",
        "name": "조성문",
        "org": None,
        "email": "FIXME",  # 이메일 확인 필요 (비거주자)
        "type": "individual",
        "pdf": "Signature Page (Sungmoon Cho).pdf",
    },
    {
        "key": "hyungjoon_yang",
        "name": "양형준",
        "org": None,
        "email": "FIXME",  # 이메일 확인 필요
        "type": "individual",
        "pdf": "Signature Page (Hyungjoon Yang).pdf",
    },
    {
        "key": "seungyoon_lee",
        "name": "이승윤",
        "org": None,
        "email": "FIXME",  # 이메일 확인 필요 (비거주자)
        "type": "individual",
        "pdf": "Signature Page (Seungyoon Lee).pdf",
    },
    {
        "key": "junyong_suh",
        "name": "서준용",
        "org": None,
        "email": "FIXME",  # 이메일 확인 필요 (거주자)
        "type": "individual",
        "pdf": "Signature Page (Junyong Suh).pdf",
    },
]

# ─────────────────────────────────────────────
# 이메일 본문 템플릿
# ─────────────────────────────────────────────
SUBJECT_INSTITUTIONAL = "EO Studio 미국 법인 전환 - Signature Packet 서명 요청"
SUBJECT_INDIVIDUAL = "EO Studio 미국 법인 전환 - 투자자 서명 요청"


def make_body_institutional(name: str, org: str) -> str:
    return f"""안녕하세요 {org} {name}님,

EO Studio의 미국 법인 전환(이하 "플립") 절차가 마지막 단계에 들어왔습니다. 이번 이메일은 귀사의 서명을 요청하기 위한 것입니다.

■ 현재 진행 상황

플립은 작년에 기본 구성과 협상을 마쳤으며, 12월 DCF 재평가를 통해 교환비율 1:52.66이 확정되었습니다. 현재는 투자자 분들의 서명을 수집하고 있으며, 동시에 한국의 외국환신고 절차를 진행 중입니다.

■ 이메일 수신 후 진행하실 일

첨부된 PDF(Signature Packet)에 서명 후 회신 부탁드립니다.

서명 패킷에는 5개 계약서의 서명 페이지가 포함되어 있습니다:
1. Stock Exchange Agreement (주식 교환 계약)
2. Preferred Stock Exchange Agreement (우선주 교환 계약)
3. Investors' Rights Agreement (투자자 권리 계약)
4. Right of First Refusal and Co-Sale Agreement (우선 구매권 및 동반 판매 계약)
5. Voting Agreement (의결권 계약)

서명 시 중요 사항:
- 법인 인감 또는 서명 권한자 인감을 사용해주세요
- 날짜는 기입하지 마세요 (Closing Day에 변호사가 입력합니다)
- 모든 페이지(5개 계약서 모두)에 서명이 필요합니다

■ 서명 제출 방법

옵션 1: 스캔 후 이메일 회신 → ash@eoeoeo.net
옵션 2: 원본 우편 발송 → 서울시 강남구 압구정로28길 9-2, 2층

■ 문의

EO Studio 안서현: ash@eoeoeo.net / 010-5382-2553
미국 변호사 Eugene Kang: kang.sings@gmail.com
한국 변호사 정호석: hoseok.jung@seumlaw.com

감사합니다.

EO Studio
Finance Lead, Seohyun Ahn
ash@eoeoeo.net
Tel. 82+ 10 5382 2553"""


def make_body_individual(name: str) -> str:
    return f"""안녕하세요 {name}님,

EO Studio의 미국 법인 전환(Flip)을 진행 중입니다.

■ 현재 진행 상황

플립은 작년에 기본 구성과 협상을 마쳤으며, 12월 DCF 재평가를 통해 교환비율 1:52.66이 확정되었습니다. 현재는 주주님들의 서명을 수집하고 있으며, 동시에 한국의 외국환신고 절차를 진행 중입니다.

■ 서명 요청 사항

첨부된 PDF에는 5개 계약서의 서명 페이지가 들어있습니다:
1. Stock Exchange Agreement (주식 교환 계약)
2. Preferred Stock Exchange Agreement (우선주 교환 계약)
3. Investors' Rights Agreement (투자자 권리 계약)
4. Right of First Refusal and Co-Sale Agreement (우선 구매권 및 동반 판매 계약)
5. Voting Agreement (의결권 계약)

서명 시 중요 사항:
- 인감이나 서명(흑색 볼펜)을 사용해주세요
- 날짜는 기입하지 마세요 (Closing Day에 변호사가 입력합니다)
- 모든 페이지(5개 모두)에 서명이 필요합니다

■ 서명 제출 방법

옵션 1: 스캔 후 이메일 회신 → ash@eoeoeo.net
옵션 2: 원본 우편 발송 → 서울시 강남구 압구정로28길 9-2, 2층

■ 문의

EO Studio 안서현: ash@eoeoeo.net / 010-5382-2553
미국 변호사 Eugene Kang: kang.sings@gmail.com
한국 변호사 정호석: hoseok.jung@seumlaw.com

감사합니다.

EO Studio
Finance Lead, Seohyun Ahn
ash@eoeoeo.net
Tel. 82+ 10 5382 2553"""


# ─────────────────────────────────────────────
# Gmail 서비스
# ─────────────────────────────────────────────
def get_service():
    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_PATH), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
        print(f"✅ 인증 완료, 토큰 저장: {TOKEN_PATH}")

    return build("gmail", "v1", credentials=creds)


# ─────────────────────────────────────────────
# 이메일 생성 (첨부파일 포함)
# ─────────────────────────────────────────────
def build_message(to: str, subject: str, body: str, attachment_path: Path) -> dict:
    msg = MIMEMultipart()
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain", "utf-8"))

    with open(attachment_path, "rb") as f:
        part = MIMEApplication(f.read(), Name=attachment_path.name)
    part["Content-Disposition"] = f'attachment; filename="{attachment_path.name}"'
    msg.attach(part)

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    return {"raw": raw}


# ─────────────────────────────────────────────
# 메인
# ─────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Flip Signature Packet 발송")
    parser.add_argument("--send", action="store_true", help="실제 발송 (없으면 dry-run)")
    parser.add_argument("--to", type=str, help="특정 수신자 key만 처리 (예: datable)")
    parser.add_argument("--test-to", type=str, dest="test_to",
                        help="첨부파일 테스트용: 지정한 이메일로 발송 (실제 수신자 override, --send 불필요)")
    args = parser.parse_args()

    # --test-to 는 자동으로 send 모드이지만 수신자가 override됨
    test_mode = bool(args.test_to)
    dry_run = not args.send and not test_mode

    # 수신자 필터
    targets = RECIPIENTS
    if args.to:
        targets = [r for r in RECIPIENTS if r["key"] == args.to]
        if not targets:
            print(f"❌ 수신자 key '{args.to}'를 찾을 수 없습니다.")
            print(f"   사용 가능한 key: {[r['key'] for r in RECIPIENTS]}")
            sys.exit(1)

    # FIXME 이메일 분류 (test_mode에서는 FIXME도 발송 가능 — 수신자가 override되므로)
    if test_mode:
        ready = list(targets)
        missing = []
    else:
        ready = [r for r in targets if "FIXME" not in r["email"]]
        missing = [r for r in targets if "FIXME" in r["email"]]

    print("=" * 60)
    if dry_run:
        print("[DRY-RUN] 실제 발송 안됨 (--send 추가 시 발송)")
    elif test_mode:
        print(f"[TEST] 테스트 발송 모드 - 모든 메일이 {args.test_to} 으로 전송됩니다")
    else:
        print("[SEND] 실제 발송 모드")
    print("=" * 60)
    print(f"\n발송 대상: {len(ready)}명 / 이메일 미확인: {len(missing)}명\n")

    if missing:
        print("[주의] 이메일 미확인 (발송 제외):")
        for r in missing:
            print(f"   - {r['key']}: {r['org'] or r['name']} -> {r['email']}")
        print()

    if not ready:
        print("발송할 수신자가 없습니다.")
        return

    # --send 모드: 수신자 목록 표시 후 명시적 확인 요구
    if args.send and not test_mode:
        print("[확인 필요] 아래 수신자에게 실제 메일을 발송합니다:")
        for r in ready:
            print(f"  -> {r['name']} ({r['org'] or '개인'}) <{r['email']}>")
        print()
        confirm = input("발송하려면 'SEND' 를 정확히 입력하세요: ").strip()
        if confirm != "SEND":
            print("취소되었습니다.")
            sys.exit(0)
        print()

    # zip에서 PDF 추출
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        service = None

        with zipfile.ZipFile(INVESTORS_ZIP) as zf:
            # zip 내 파일 목록 (PDF만)
            pdf_files = {
                Path(name).name: name
                for name in zf.namelist()
                if name.endswith(".pdf") and not name.startswith("__MACOSX")
            }

            for r in ready:
                pdf_name = r["pdf"]
                if pdf_name not in pdf_files:
                    print(f"❌ {r['key']}: zip에서 '{pdf_name}' 파일을 찾을 수 없습니다. 건너뜀.")
                    continue

                # PDF 추출
                zip_entry = pdf_files[pdf_name]
                extracted_path = tmp_path / pdf_name
                extracted_path.write_bytes(zf.read(zip_entry))

                # 이메일 구성
                if r["type"] == "institutional":
                    subject = SUBJECT_INSTITUTIONAL
                    body = make_body_institutional(r["name"], r["org"])
                else:
                    subject = SUBJECT_INDIVIDUAL
                    body = make_body_individual(r["name"])

                print(f"{'─' * 50}")
                print(f"수신자  : {r['name']} ({r['org'] or '개인'})")
                print(f"이메일  : {r['email']}")
                print(f"제목    : {subject}")
                print(f"첨부파일: {pdf_name}")

                if dry_run:
                    print(f"[DRY-RUN] 발송 생략")
                else:
                    # test_mode: 실제 수신자 대신 테스트 이메일로 override
                    actual_to = args.test_to if test_mode else r["email"]

                    if service is None:
                        print("\nGmail 인증 중...")
                        service = get_service()

                    msg = build_message(actual_to, subject, body, extracted_path)
                    result = service.users().messages().send(
                        userId="me", body=msg
                    ).execute()
                    if test_mode:
                        print(f"[TEST-OK] 테스트 발송 완료 -> {actual_to} (Message ID: {result['id']})")
                    else:
                        print(f"[OK] 발송 완료! Message ID: {result['id']}")
                print()

    print("=" * 60)
    if dry_run:
        print(f"DRY-RUN 완료. 실제 발송하려면 --send 옵션을 추가하세요.")
        print(f"  특정 수신자만 테스트 발송: --to datable --send")
    else:
        print(f"발송 완료: {len(ready)}건")
    print("=" * 60)


if __name__ == "__main__":
    main()
