"""
notice_analyzer.py
역할: 수집된 Slack 메시지에서 주요 공지사항을 추출한다.
      핀된 메시지 우선, 그 다음 최신 날짜순으로 정렬하여 상위 N건을 반환한다.
      Notion 페이지 중 최근 수정된 필독 문서도 함께 선정한다.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from dateutil import parser as dateutil_parser

logger = logging.getLogger(__name__)


class NoticeAnalyzer:
    """
    Slack 메시지에서 주요 공지사항을 추출하고,
    Notion 페이지 중 필독 문서를 선정하는 클래스.
    """

    def __init__(self, raw_data_dir: str):
        """
        Args:
            raw_data_dir: data/raw/ 디렉토리 경로
        """
        self.raw_data_dir = Path(raw_data_dir)

    def extract_notices(self, count: int = 5) -> list[dict]:
        """
        Slack 수집 데이터에서 주요 공지사항 상위 N건을 추출한다.

        우선순위:
        1. 핀된(is_pinned=True) 메시지
        2. 최신 타임스탬프(ts) 순
        3. 텍스트 길이가 긴 메시지 (내용이 많은 것 우선)

        Args:
            count: 추출할 공지사항 수

        Returns:
            공지사항 목록
            예: [{"text": "...", "is_pinned": True, "date": "2026-02-20", "channel": "general"}]
        """
        all_messages: list[dict] = []

        slack_dir = self.raw_data_dir / "slack"
        if not slack_dir.exists():
            logger.warning("Slack 수집 데이터 디렉토리가 없습니다.")
            return []

        # 모든 채널 JSON 파일 로드
        for json_file in slack_dir.glob("*.json"):
            try:
                # 파일명에서 채널명 추출 (예: general_20260224.json -> general)
                channel_name = json_file.stem.rsplit("_", 1)[0]

                with open(json_file, "r", encoding="utf-8") as f:
                    messages = json.load(f)

                if not isinstance(messages, list):
                    continue

                for msg in messages:
                    if isinstance(msg, dict) and msg.get("text"):
                        msg["channel"] = channel_name
                        all_messages.append(msg)

            except (json.JSONDecodeError, OSError) as e:
                logger.warning(f"파일 로드 실패 ({json_file}): {e}")

        if not all_messages:
            logger.warning("분석할 Slack 메시지가 없습니다.")
            return []

        # 타임스탬프를 날짜로 변환하여 추가
        for msg in all_messages:
            ts = msg.get("ts", "0")
            try:
                dt = datetime.fromtimestamp(float(ts))
                msg["date"] = dt.strftime("%Y-%m-%d")
                msg["datetime"] = dt
            except (ValueError, TypeError):
                msg["date"] = "알 수 없음"
                msg["datetime"] = datetime.min

        # 정렬: 핀된 메시지 우선, 그 다음 최신 날짜, 그 다음 텍스트 길이 내림차순
        sorted_messages = sorted(
            all_messages,
            key=lambda m: (
                -int(m.get("is_pinned", False)),   # 핀된 메시지 우선
                -m["datetime"].timestamp(),          # 최신 순
                -len(m.get("text", "")),             # 텍스트 길이 내림차순
            )
        )

        # 텍스트가 너무 짧은 메시지 제외 (20자 미만)
        filtered = [
            msg for msg in sorted_messages
            if len(msg.get("text", "")) >= 20
        ]

        # 상위 N건 추출 및 불필요한 필드 정리
        notices = []
        for msg in filtered[:count]:
            notices.append({
                "text": msg.get("text", ""),
                "is_pinned": msg.get("is_pinned", False),
                "date": msg.get("date", "알 수 없음"),
                "channel": msg.get("channel", ""),
                "has_files": msg.get("has_files", False),
            })

        logger.info(f"공지사항 추출 완료: {len(notices)}건 (전체 {len(all_messages)}건 중)")
        return notices

    def extract_must_read_pages(self, count: int = 5) -> list[dict]:
        """
        Notion 수집 데이터에서 신규 입사자 필독 문서를 선정한다.

        선정 기준:
        1. 최근 수정일 기준 정렬 (최신 문서 우선)
        2. 본문 내용이 있는 페이지 (content 비어있지 않음)

        Args:
            count: 선정할 필독 문서 수

        Returns:
            필독 문서 목록
            예: [{"id": "...", "title": "...", "last_edited_time": "...", "url": "..."}]
        """
        pages: list[dict] = []

        notion_dir = self.raw_data_dir / "notion"
        if not notion_dir.exists():
            logger.warning("Notion 수집 데이터 디렉토리가 없습니다.")
            return []

        for json_file in notion_dir.glob("*.json"):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    page_data = json.load(f)

                if not isinstance(page_data, dict):
                    continue

                # 본문이 있는 페이지만 포함
                if not page_data.get("content", "").strip():
                    continue

                # 수정일 파싱
                last_edited = page_data.get("last_edited_time", "")
                try:
                    parsed_date = dateutil_parser.parse(last_edited) if last_edited else datetime.min
                except (ValueError, TypeError):
                    parsed_date = datetime.min

                pages.append({
                    "id": page_data.get("id", ""),
                    "title": page_data.get("title", "(제목 없음)"),
                    "last_edited_time": last_edited,
                    "last_edited_parsed": parsed_date,
                    "url": page_data.get("url", ""),
                    "content_preview": page_data.get("content", "")[:200],  # 미리보기 200자
                })

            except (json.JSONDecodeError, OSError) as e:
                logger.warning(f"Notion 파일 로드 실패 ({json_file}): {e}")

        if not pages:
            logger.warning("분석할 Notion 페이지가 없습니다.")
            return []

        # 최신 수정일 순으로 정렬
        sorted_pages = sorted(
            pages,
            key=lambda p: p["last_edited_parsed"],
            reverse=True
        )

        # 불필요한 파싱 필드 제거 후 반환
        must_read = []
        for page in sorted_pages[:count]:
            must_read.append({
                "id": page["id"],
                "title": page["title"],
                "last_edited_time": page["last_edited_time"],
                "url": page["url"],
                "content_preview": page["content_preview"],
            })

        logger.info(f"필독 문서 선정 완료: {len(must_read)}건 (전체 {len(pages)}건 중)")
        return must_read

    def analyze_from_data(
        self,
        slack_data: dict,
        notion_data: list,
        notice_count: int = 5,
        must_read_count: int = 5,
    ) -> dict:
        """
        직접 데이터를 받아서 분석한다 (파일 로드 없이).

        Args:
            slack_data: SlackCollector.run()의 반환값
            notion_data: NotionCollector.run()의 반환값
            notice_count: 추출할 공지사항 수
            must_read_count: 선정할 필독 문서 수

        Returns:
            {"notices": [...], "must_read_pages": [...]}
        """
        # Slack 메시지 전처리
        all_messages: list[dict] = []
        for channel, messages in slack_data.items():
            for msg in messages:
                if isinstance(msg, dict) and msg.get("text"):
                    ts = msg.get("ts", "0")
                    try:
                        dt = datetime.fromtimestamp(float(ts))
                        msg["date"] = dt.strftime("%Y-%m-%d")
                        msg["datetime"] = dt
                    except (ValueError, TypeError):
                        msg["date"] = "알 수 없음"
                        msg["datetime"] = datetime.min
                    msg["channel"] = channel
                    all_messages.append(msg)

        # 공지사항 추출
        sorted_messages = sorted(
            [m for m in all_messages if len(m.get("text", "")) >= 20],
            key=lambda m: (
                -int(m.get("is_pinned", False)),
                -(lambda ts: float(ts) if ts and ts.replace(".", "").isdigit() else 0)(m.get("ts", "0")),
                -len(m.get("text", "")),
            )
        )

        notices = [
            {
                "text": msg.get("text", ""),
                "is_pinned": msg.get("is_pinned", False),
                "date": msg.get("date", "알 수 없음"),
                "channel": msg.get("channel", ""),
                "has_files": msg.get("has_files", False),
            }
            for msg in sorted_messages[:notice_count]
        ]

        # Notion 필독 문서 선정
        pages_with_date = []
        for page in notion_data:
            if not page.get("content", "").strip():
                continue
            last_edited = page.get("last_edited_time", "")
            try:
                parsed_date = dateutil_parser.parse(last_edited) if last_edited else datetime.min
            except (ValueError, TypeError):
                parsed_date = datetime.min
            pages_with_date.append((page, parsed_date))

        sorted_pages = sorted(pages_with_date, key=lambda x: x[1], reverse=True)
        must_read_pages = [
            {
                "id": page.get("id", ""),
                "title": page.get("title", "(제목 없음)"),
                "last_edited_time": page.get("last_edited_time", ""),
                "url": page.get("url", ""),
                "content_preview": page.get("content", "")[:200],
            }
            for page, _ in sorted_pages[:must_read_count]
        ]

        return {
            "notices": notices,
            "must_read_pages": must_read_pages,
        }

    def __repr__(self) -> str:
        return f"NoticeAnalyzer(raw_data_dir={self.raw_data_dir})"
