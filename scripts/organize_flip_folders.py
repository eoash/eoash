# -*- coding: utf-8 -*-
"""
Flip 투자자별 첨부파일 폴더 생성 스크립트
각 투자자 폴더에 Signature Packet/Page PDF + 계약서 6개를 넣음
"""
import io, os, sys, shutil, zipfile
from pathlib import Path

if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

PROJECT_ROOT = Path(__file__).parent.parent
INVESTORS_ZIP = PROJECT_ROOT / "flip_signature_investors.zip"
CONTRACT_DIR = PROJECT_ROOT / "docs" / "flip" / "EO - Flip Documents"
OUTPUT_DIR = PROJECT_ROOT / "flip_review"
ZIP_INNER_DIR = "EO - PDF Signature Packets (Investors) /"

RECIPIENTS = [
    {"id": "01_futureplay",       "name": "퓨처플레이 (FuturePlay)",         "type": "기관-한국", "pdf": "Signature Packet (FuturePlay).pdf"},
    {"id": "02_datable",          "name": "데이터블 (Datable)",              "type": "기관-한국", "pdf": "Signature Packet (Datable).pdf"},
    {"id": "03_base_dstring",     "name": "베이스디스트링 (Base Dstring)",     "type": "기관-한국", "pdf": "Signature Packet (Base Dstring).pdf"},
    {"id": "04_base_metronome",   "name": "베이스메트로놈 (Base Metronome)",   "type": "기관-한국", "pdf": "Signature Packet (Base Metronome).pdf"},
    {"id": "05_nest_company",     "name": "네스트컴퍼니 (Nest Company)",      "type": "기관-한국", "pdf": "Signature Packet (Next Company).pdf"},  # PDF 파일명은 변호사 원본 (오타)
    {"id": "06_cnt_tech_sports",  "name": "씨엔티테크 (CNT Tech Sports)",     "type": "기관-한국", "pdf": "Signature Packet (CNT Tech Sports Startup).pdf"},
    {"id": "07_ai_angel_cnt",     "name": "에이아이엔젤 (AI Angel CNT)",      "type": "기관-한국", "pdf": "Signature Packet (AI Angel - CNT Tech).pdf"},
    {"id": "08_primer_sazze",     "name": "프라이머사제 (Primer Sazze)",      "type": "기관-미국", "pdf": "Signature Packet (Primer Sazze).pdf"},
    {"id": "09_jae_sik_shin",     "name": "신재식",                          "type": "개인-거주자", "pdf": "Signature Packet (Jae Sik Shin).pdf"},
    {"id": "10_sung_hun_kim",     "name": "김성훈",                          "type": "개인-거주자", "pdf": "Signature Page (Sung Hun Kim).pdf"},
    {"id": "11_wonjun_chang",     "name": "장원준",                          "type": "개인-거주자", "pdf": "Signature Page (Wonjun Chang).pdf"},
    {"id": "12_hyungjoon_yang",   "name": "양형준",                          "type": "개인-거주자", "pdf": "Signature Page (Hyungjoon Yang).pdf"},
    {"id": "13_junyong_suh",      "name": "서준용",                          "type": "개인-거주자", "pdf": "Signature Page (Junyong Suh).pdf"},
    {"id": "14_seungyoon_lee",    "name": "이승윤",                          "type": "개인-비거주자", "pdf": "Signature Page (Seungyoon Lee).pdf"},
    {"id": "15_sungmoon_cho",     "name": "조성문",                          "type": "개인-비거주자", "pdf": "Signature Page (Sungmoon Cho).pdf"},
    {"id": "16_keeyong_han",      "name": "한기용",                          "type": "개인-비거주자", "pdf": "Signature Page (Keeyong Han).pdf"},
]

CONTRACT_FILES = [
    "EO - Amended and Restated Certificate of Incorporation.docx",
    "EO - Common Stock Exchange Agreement.docx",
    "EO - Preferred Stock Exchange Agreement.docx",
    "EO - Investors' Rights Agreement.docx",
    "EO - Right of First Refusal and Co-Sale Agreement.docx",
    "EO - Voting Agreement.docx",
]


def main():
    # 기존 폴더 초기화
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True)

    # ZIP 열기
    with zipfile.ZipFile(INVESTORS_ZIP) as zf:
        pdf_map = {
            Path(name).name: name
            for name in zf.namelist()
            if name.endswith(".pdf") and not name.startswith("__MACOSX")
        }

        for r in RECIPIENTS:
            folder = OUTPUT_DIR / r["id"]
            folder.mkdir()

            # 1) Signature PDF 추출
            pdf_name = r["pdf"]
            zip_entry = pdf_map.get(pdf_name)
            if zip_entry:
                (folder / pdf_name).write_bytes(zf.read(zip_entry))
                print(f"  [OK] {r['id']}/{pdf_name}")
            else:
                print(f"  [!!] {r['id']}: PDF not found in zip: {pdf_name}")

            # 2) 계약서 복사
            for cf in CONTRACT_FILES:
                src = CONTRACT_DIR / cf
                if src.exists():
                    shutil.copy2(src, folder / cf)

            # 3) README 생성
            readme = f"""# {r['name']}
유형: {r['type']}
첨부파일: {pdf_name}
계약서: {len(CONTRACT_FILES)}개

## 첨부 파일 목록
1. {pdf_name} (서명 요청)
"""
            for i, cf in enumerate(CONTRACT_FILES, 2):
                readme += f"{i}. {cf}\n"

            (folder / "_INFO.txt").write_text(readme, encoding="utf-8")

    print(f"\n완료! {len(RECIPIENTS)}개 폴더 생성: {OUTPUT_DIR}")
    print(f"\n폴더 구조:")
    for r in RECIPIENTS:
        file_count = len(list((OUTPUT_DIR / r["id"]).iterdir()))
        print(f"  {r['id']}/  ({r['name']}, {r['type']}) — {file_count}개 파일")


if __name__ == "__main__":
    main()
