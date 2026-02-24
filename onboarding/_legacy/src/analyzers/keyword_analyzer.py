"""
keyword_analyzer.py
역할: 수집된 Slack 메시지와 Notion 페이지 본문에서 회사 문화 키워드 Top N을 추출한다.
      collections.Counter 기반 빈도 분석을 수행하며, 불용어(stopwords)를 제거한 뒤 상위 N개를 반환한다.
"""

import json
import logging
import re
from collections import Counter
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class KeywordAnalyzer:
    """
    Slack 및 Notion 수집 데이터에서 키워드 빈도를 분석하는 클래스.
    상위 N개 키워드를 {keyword, count} 형태로 반환한다.
    """

    def __init__(
        self,
        raw_data_dir: str,
        stopwords: list[str] = None,
        min_length: int = 2,
        min_count: int = 2,
    ):
        """
        Args:
            raw_data_dir: data/raw/ 디렉토리 경로
            stopwords: 빈도 분석에서 제외할 단어 목록
            min_length: 키워드 최소 길이 (기본값 2자 이상)
            min_count: 키워드 최소 등장 횟수 (기본값 2회 이상)
        """
        self.raw_data_dir = Path(raw_data_dir)
        self.stopwords = set(stopwords or [])
        self.min_length = min_length
        self.min_count = min_count

        # 기본 불용어 추가 (조사, 어미 등)
        self.stopwords.update({
            "이", "가", "을", "를", "은", "는", "의", "에", "에서", "으로", "로",
            "와", "과", "도", "만", "그", "저", "이런", "저런", "있습니다", "합니다",
            "됩니다", "했습니다", "하겠습니다", "드립니다", "감사합니다", "안녕하세요",
            "the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to",
            "for", "of", "and", "or", "it", "this", "that", "be", "have", "has",
            "will", "can", "we", "you", "they", "he", "she", "with", "from",
            # 마스킹 토큰 잔여 / URL 잔여
            "name", "email", "phone", "masked", "https", "http", "mailto",
            "com", "www", "co", "kr",
        })

    def extract_keywords(self, top_n: int = 10) -> list[dict]:
        """
        raw_data_dir 하위의 모든 JSON 파일에서 텍스트를 수집하고 키워드를 분석한다.

        Args:
            top_n: 반환할 상위 키워드 수

        Returns:
            키워드 빈도 목록 (내림차순 정렬)
            예: [{"keyword": "자동화", "count": 47}, ...]
        """
        all_text = self._collect_all_text()

        if not all_text:
            logger.warning("분석할 텍스트 데이터가 없습니다.")
            return []

        # 텍스트에서 단어 추출
        words = self._tokenize(all_text)

        # 빈도 계산
        counter = Counter(words)

        # 최소 등장 횟수 필터링
        filtered = {
            word: count
            for word, count in counter.items()
            if count >= self.min_count
        }

        # 상위 N개 추출
        top_keywords = [
            {"keyword": word, "count": count}
            for word, count in sorted(
                filtered.items(), key=lambda x: x[1], reverse=True
            )[:top_n]
        ]

        logger.info(f"키워드 분석 완료: 상위 {len(top_keywords)}개 추출 (전체 {len(words)}개 단어)")
        return top_keywords

    def _collect_all_text(self) -> str:
        """
        data/raw/slack/ 와 data/raw/notion/ 하위 JSON 파일에서 텍스트를 모두 추출한다.
        """
        texts: list[str] = []

        # Slack 메시지 텍스트 수집
        slack_dir = self.raw_data_dir / "slack"
        if slack_dir.exists():
            for json_file in slack_dir.glob("*.json"):
                try:
                    with open(json_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if isinstance(data, list):
                        for msg in data:
                            text = msg.get("text", "")
                            if text and isinstance(text, str):
                                texts.append(text)
                except (json.JSONDecodeError, OSError) as e:
                    logger.warning(f"JSON 파일 로드 실패 ({json_file}): {e}")

        # Notion 페이지 본문 수집
        notion_dir = self.raw_data_dir / "notion"
        if notion_dir.exists():
            for json_file in notion_dir.glob("*.json"):
                try:
                    with open(json_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if isinstance(data, dict):
                        # 제목과 본문 모두 분석
                        title = data.get("title", "")
                        content = data.get("content", "")
                        if title:
                            texts.append(title)
                        if content:
                            texts.append(content)
                except (json.JSONDecodeError, OSError) as e:
                    logger.warning(f"JSON 파일 로드 실패 ({json_file}): {e}")

        return " ".join(texts)

    def _tokenize(self, text: str) -> list[str]:
        """
        텍스트를 단어 단위로 분리하고 불용어를 제거한다.
        한글 2자 이상 단어와 영어 단어를 모두 처리한다.

        Args:
            text: 분석할 원본 텍스트

        Returns:
            정제된 단어 목록
        """
        # 노이즈 제거 (키워드 분석 전 전처리)
        text = re.sub(r"\[(?:NAME|EMAIL|PHONE|MASKED)\]", " ", text)  # 마스킹 토큰
        text = re.sub(r"https?://\S+", " ", text)                      # URL
        text = re.sub(r"<@[A-Z0-9]+>", " ", text)                      # Slack 멘션
        text = re.sub(r"<#[A-Z0-9]+(?:\|[^>]+)?>", " ", text)         # Slack 채널 링크
        text = re.sub(r"mailto:[^\s|>]+", " ", text)                   # mailto 링크

        words: list[str] = []

        # 한글 단어 추출 (2자 이상)
        korean_words = re.findall(r"[가-힣]{2,}", text)
        words.extend(korean_words)

        # 영어 단어 추출 (2자 이상, 소문자 변환)
        english_words = re.findall(r"[a-zA-Z]{2,}", text)
        words.extend(w.lower() for w in english_words)

        # 불용어 및 최소 길이 필터링
        filtered = [
            w for w in words
            if w not in self.stopwords and len(w) >= self.min_length
        ]

        return filtered

    def analyze_from_data(self, slack_data: dict, notion_data: list, top_n: int = 10) -> list[dict]:
        """
        직접 데이터를 받아서 키워드를 분석한다 (파일 로드 없이).

        Args:
            slack_data: SlackCollector.run()의 반환값
            notion_data: NotionCollector.run()의 반환값
            top_n: 반환할 상위 키워드 수

        Returns:
            키워드 빈도 목록
        """
        texts: list[str] = []

        # Slack 메시지 텍스트
        for channel_messages in slack_data.values():
            for msg in channel_messages:
                text = msg.get("text", "")
                if text:
                    texts.append(text)

        # Notion 페이지 텍스트
        for page in notion_data:
            title = page.get("title", "")
            content = page.get("content", "")
            if title:
                texts.append(title)
            if content:
                texts.append(content)

        if not texts:
            return []

        all_text = " ".join(texts)
        words = self._tokenize(all_text)
        counter = Counter(words)

        return [
            {"keyword": word, "count": count}
            for word, count in counter.most_common(top_n)
            if count >= self.min_count
        ]

    def __repr__(self) -> str:
        return f"KeywordAnalyzer(stopwords={len(self.stopwords)}개, min_count={self.min_count})"
