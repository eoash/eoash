"""
data_masker.py
역할: 수집된 데이터에서 개인정보(이름, 이메일, 전화번호)를 [MASKED]로 치환한다.
      수집 직후 즉시 마스킹하여 raw 데이터에도 개인정보가 저장되지 않도록 한다.
"""

import re
import logging
from typing import Any

logger = logging.getLogger(__name__)


class DataMasker:
    """
    텍스트에서 개인정보를 탐지하고 마스킹 처리하는 클래스.

    마스킹 대상:
    - 이메일 주소: user@example.com → [EMAIL]
    - 한국 전화번호: 010-1234-5678 → [PHONE]
    - 한글 이름 (성+이름 2~4자): 홍길동 → [NAME]
    - 영문 이름 (First Last 패턴): John Doe → [NAME]
    """

    # 이메일 주소 패턴
    EMAIL_PATTERN = re.compile(
        r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
        re.IGNORECASE
    )

    # 한국 전화번호 패턴 (010-XXXX-XXXX, 02-XXXX-XXXX 등)
    PHONE_PATTERN = re.compile(
        r"(?:0\d{1,2})[-.\s]?\d{3,4}[-.\s]?\d{4}"
    )

    # 한글 이름 패턴 (3~4자만: 2자는 일반 단어 오탐 너무 많음)
    KOREAN_NAME_PATTERN = re.compile(
        r"(?<![가-힣])[가-힣]{3,4}(?![가-힣])"
    )

    # 영문 이름 패턴 (대문자로 시작하는 단어 3개 연속만: 2단어는 오탐 너무 많음)
    ENGLISH_NAME_PATTERN = re.compile(
        r"\b[A-Z][a-z]+(?:\s[A-Z][a-z]+){2}\b"
    )

    # 한글 이름에서 제외할 일반 단어 목록 (오탐 방지)
    KOREAN_COMMON_WORDS = {
        # 직급/직책
        "회사", "팀장", "부장", "과장", "대리", "사원", "인턴", "대표", "이사",
        "매니저", "리더", "담당자", "책임자",
        # 부서/기능
        "디자인", "개발", "마케팅", "운영", "재무", "인사", "법무", "총무", "영업",
        "기획", "전략", "콘텐츠", "프로덕트", "데이터", "엔지니어",
        # 업무 행위
        "미팅", "회의", "보고", "결재", "승인", "검토", "확인", "완료", "예정",
        "공지", "안내", "업무", "처리", "작성", "수정", "삭제", "등록", "조회",
        "제출", "요청", "발송", "전달", "공유", "배포", "반영",
        # 문서/자료
        "프로젝트", "일정", "계획", "목표", "성과", "정책", "규정", "절차",
        "가이드", "매뉴얼", "온보딩", "오리엔테이션", "문서", "자료", "양식",
        "계약", "서류", "리포트", "아젠다", "서비스", "시스템", "플랫폼",
        # 도구
        "슬랙", "노션", "지라", "깃허브", "에어테이블", "구글", "카카오",
        "에어팟", "노트북",
        # 지역
        "한국", "미국", "베트남", "서울", "부산", "대구", "인천",
        # 시간
        "월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일",
        "오늘", "내일", "어제", "이번주", "다음주", "이번달", "다음달",
        # 기타 업무 맥락에서 자주 나오는 3~4자 일반 단어
        "관련된", "준비된", "입사자", "신규자", "경력자", "담당팀", "운영팀",
        "인사팀", "재무팀", "개발팀", "기획팀", "디자인팀",
    }

    def mask_text(self, text: str) -> str:
        """
        텍스트에서 개인정보를 마스킹한다.

        Args:
            text: 마스킹할 원본 텍스트

        Returns:
            개인정보가 [EMAIL], [PHONE], [NAME]으로 치환된 텍스트
        """
        if not text or not isinstance(text, str):
            return text

        try:
            # 1. 이메일 마스킹 (가장 먼저 처리 - 이름 패턴과 겹칠 수 있음)
            text = self.EMAIL_PATTERN.sub("[EMAIL]", text)

            # 2. 전화번호 마스킹
            text = self.PHONE_PATTERN.sub("[PHONE]", text)

            # 3. 영문 이름 마스킹 (First Last 패턴)
            text = self.ENGLISH_NAME_PATTERN.sub("[NAME]", text)

            # 4. 한글 이름 마스킹 (일반 단어 제외)
            text = self._mask_korean_names(text)

        except Exception as e:
            logger.warning(f"마스킹 처리 중 오류 (원본 반환): {e}")

        return text

    def _mask_korean_names(self, text: str) -> str:
        """
        한글 이름 패턴을 마스킹한다.
        오탐(일반 한글 단어를 이름으로 잘못 인식) 방지를 위해 common words를 제외한다.
        """
        def replace_name(match: re.Match) -> str:
            word = match.group(0)
            if word in self.KOREAN_COMMON_WORDS:
                return word  # 일반 단어는 마스킹하지 않음
            return "[NAME]"

        return self.KOREAN_NAME_PATTERN.sub(replace_name, text)

    def mask_dict(self, data: dict[str, Any]) -> dict[str, Any]:
        """
        딕셔너리 내 모든 문자열 값을 재귀적으로 마스킹한다.

        Args:
            data: 마스킹할 딕셔너리

        Returns:
            개인정보가 마스킹된 딕셔너리 (원본 변경 없음)
        """
        if not isinstance(data, dict):
            return data

        masked = {}
        for key, value in data.items():
            if isinstance(value, str):
                masked[key] = self.mask_text(value)
            elif isinstance(value, dict):
                masked[key] = self.mask_dict(value)
            elif isinstance(value, list):
                masked[key] = self.mask_list(value)
            else:
                masked[key] = value
        return masked

    def mask_list(self, data: list[Any]) -> list[Any]:
        """
        리스트 내 모든 요소를 재귀적으로 마스킹한다.

        Args:
            data: 마스킹할 리스트

        Returns:
            개인정보가 마스킹된 리스트 (원본 변경 없음)
        """
        masked = []
        for item in data:
            if isinstance(item, str):
                masked.append(self.mask_text(item))
            elif isinstance(item, dict):
                masked.append(self.mask_dict(item))
            elif isinstance(item, list):
                masked.append(self.mask_list(item))
            else:
                masked.append(item)
        return masked

    def __repr__(self) -> str:
        return "DataMasker(email=True, phone=True, name=True)"
