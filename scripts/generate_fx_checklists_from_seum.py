#!/usr/bin/env python3
"""
세움 FX 체크리스트 원본(SEUM v3.0)에서 투자자별 해당 섹션만 추출해
flip_review/{폴더}/CHECKLIST.docx로 교체 저장

기존 CHECKLIST.docx → CHECKLIST_OLD.docx 백업

Usage:
  python scripts/generate_fx_checklists_from_seum.py
  python scripts/generate_fx_checklists_from_seum.py --dry-run
"""
import argparse
import os
import sys
from copy import deepcopy
from pathlib import Path

from docx import Document

SOURCE = Path(os.environ.get("SEUM_SOURCE", "")) or Path(__file__).parent.parent / "docs" / "flip" / "[SEUM] EO Studio Flip FX Checklist_v3.0_260219.docx"
FLIP_REVIEW = Path(__file__).parent.parent / "flip_review"
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

# 각 폴더 → 매칭할 섹션 헤더 키워드
FOLDER_SECTION = {
    "00_taeyong_kim":     "김태용이 준비할 서류",
    "01_futureplay":      "법인 및 투자조합이 준비할 서류",
    "02_datable":         "법인 및 투자조합이 준비할 서류",
    "03_base_dstring":    "법인 및 투자조합이 준비할 서류",
    "04_base_metronome":  "법인 및 투자조합이 준비할 서류",
    "05_nest_company":    "법인 및 투자조합이 준비할 서류",
    "06_cnt_tech_sports": "법인 및 투자조합이 준비할 서류",
    "07_ai_angel_cnt":    "법인 및 투자조합이 준비할 서류",
    "09_jae_sik_shin":    "신재식, 김성훈, 장원준, 양형준",
    "10_sung_hun_kim":    "신재식, 김성훈, 장원준, 양형준",
    "11_wonjun_chang":    "신재식, 김성훈, 장원준, 양형준",
    "12_hyungjoon_yang":  "신재식, 김성훈, 장원준, 양형준",
    "13_junyong_suh":     "서준용",
    # 08_primer_sazze: 미국 기관 → 외국환신고 불필요, 생략
    # 14~16 비거주자: 외국환신고 불필요, 생략
}


def get_text(elem):
    return "".join(t.text or "" for t in elem.iter(f"{{{W_NS}}}t"))


def extract_sections(body):
    """body 요소를 섹션별로 그룹화. 반환: {헤더텍스트: [elem, ...]}"""
    sections = {}
    current_key = None
    current_elems = []

    for child in body:
        tag = child.tag.split("}")[-1]
        if tag == "sectPr":
            continue

        if tag == "p":
            text = get_text(child)
            if "신고인" in text and "준비할 서류" in text:
                if current_key and current_elems:
                    sections[current_key] = current_elems
                current_key = text
                current_elems = [child]
            elif current_key is not None:
                current_elems.append(child)

        elif tag == "tbl":
            if current_key is not None:
                current_elems.append(child)

    if current_key and current_elems:
        sections[current_key] = current_elems

    return sections


def find_section(sections, keyword):
    for key, elems in sections.items():
        if keyword in key:
            return elems
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="실제 파일 저장 없이 미리보기")
    args = parser.parse_args()

    if not SOURCE.exists():
        print(f"[오류] 원본 파일 없음: {SOURCE}")
        sys.exit(1)

    source_doc = Document(str(SOURCE))
    sections = extract_sections(source_doc.element.body)

    print(f"원본에서 발견된 섹션 {len(sections)}개:")
    for k in sections:
        print(f"  - {k[:70]}")
    print()

    created = 0
    skipped = 0

    for folder in sorted(FLIP_REVIEW.iterdir()):
        if not folder.is_dir():
            continue
        folder_id = folder.name
        if folder_id not in FOLDER_SECTION:
            continue

        keyword = FOLDER_SECTION[folder_id]
        section_elems = find_section(sections, keyword)

        if not section_elems:
            print(f"[경고] 섹션 매칭 실패: {folder_id} ({keyword})")
            skipped += 1
            continue

        out_path = folder / "CHECKLIST.docx"
        old_path = folder / "CHECKLIST_OLD.docx"

        if args.dry_run:
            exists = "있음" if out_path.exists() else "없음"
            print(f"  [DRY-RUN] {folder_id}/CHECKLIST.docx ({exists}) → 섹션: {keyword[:40]}")
            created += 1
            continue

        # 새 문서 생성 (원본 스타일 상속)
        out_doc = Document(str(SOURCE))
        out_body = out_doc.element.body

        # sectPr(페이지 설정) 미리 deepcopy
        sect_pr_tag = f"{{{W_NS}}}sectPr"
        sect_pr = out_body.find(sect_pr_tag)
        sect_pr_copy = deepcopy(sect_pr) if sect_pr is not None else None

        # body 전체 비우기
        for child in list(out_body):
            out_body.remove(child)

        # 섹션 요소 추가
        for elem in section_elems:
            out_body.append(deepcopy(elem))

        # sectPr 복원
        if sect_pr_copy is not None:
            out_body.append(sect_pr_copy)

        # 기존 CHECKLIST.docx 백업
        if out_path.exists():
            if old_path.exists():
                old_path.unlink()
            out_path.rename(old_path)

        out_doc.save(str(out_path))
        print(f"  [OK] {folder_id}/CHECKLIST.docx 생성 (섹션: {keyword[:40]})")
        created += 1

    print()
    if args.dry_run:
        print(f"[DRY-RUN 완료] 생성 예정: {created}개 | 건너뜀: {skipped}개")
    else:
        print(f"[완료] 생성: {created}개 | 건너뜀: {skipped}개")
        if skipped == 0:
            print("기존 CHECKLIST.docx는 CHECKLIST_OLD.docx로 백업되었습니다.")


if __name__ == "__main__":
    main()
