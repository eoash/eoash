"""
notion_collector.py
역할: Notion API를 통해 지정된 페이지 ID의 제목, 본문 텍스트, 마지막 수정일을 수집한다.
      수집된 데이터는 data_masker로 개인정보 마스킹 후 data/raw/notion/ 에 JSON으로 저장된다.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from notion_client import Client
from notion_client.errors import APIResponseError

from .data_masker import DataMasker
from .rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


class NotionCollector:
    """
    Notion API 수집기.
    지정된 페이지 ID 목록의 제목, 본문 텍스트, 마지막 수정일을 수집한다.
    수집 직후 개인정보를 마스킹하고 JSON으로 저장한다.
    """

    def __init__(
        self,
        token: str,
        page_ids: list[str],
        output_dir: str = "data/raw/notion",
        rate_limit_delay: float = 0.5,
    ):
        """
        Args:
            token: Notion Integration Token (NOTION_API_KEY)
            page_ids: 수집할 페이지 ID 목록
            output_dir: JSON 저장 디렉토리 경로
            rate_limit_delay: API 요청 간 딜레이 (초). Notion은 분당 3요청/초 제한.
        """
        self.client = Client(auth=token)
        self.page_ids = page_ids
        self.output_dir = Path(output_dir)
        self.masker = DataMasker()
        self.rate_limiter = RateLimiter(delay_seconds=rate_limit_delay)

        # 출력 디렉토리 생성
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def run(self) -> list[dict]:
        """
        지정된 모든 페이지 데이터를 수집하고 JSON으로 저장한다.

        Returns:
            수집된 페이지 데이터 목록
            예: [{"id": "...", "title": "...", "content": "...", "last_edited_time": "..."}]
        """
        results: list[dict] = []
        today_str = datetime.now().strftime("%Y%m%d")

        logger.info(f"Notion 수집 시작: {len(self.page_ids)}개 페이지")

        for page_id in self.page_ids:
            # 페이지 ID에서 하이픈 제거하여 파일명 정규화
            clean_id = page_id.replace("-", "")

            try:
                logger.info(f"페이지 수집 중: {page_id}")
                page_data = self._collect_page(page_id)
                results.append(page_data)

                # JSON 파일로 저장
                output_path = self.output_dir / f"{clean_id}_{today_str}.json"
                self._save_json(page_data, output_path)
                logger.info(f"  저장 완료: {output_path} (제목: {page_data.get('title', 'N/A')})")

            except APIResponseError as e:
                logger.error(f"페이지 {page_id} 수집 실패 (Notion API 오류): {e.status} - {e.code}")
            except Exception as e:
                logger.error(f"페이지 {page_id} 수집 실패 (알 수 없는 오류): {e}")

        logger.info(f"Notion 수집 완료: 총 {len(results)}건")
        return results

    def _collect_page(self, page_id: str) -> dict:
        """
        단일 Notion 페이지의 메타데이터와 본문을 수집한다.

        Args:
            page_id: Notion 페이지 ID

        Returns:
            페이지 데이터 딕셔너리 (마스킹 처리됨)
        """
        # 페이지 메타데이터 조회 (제목, 수정일 등)
        self.rate_limiter.wait()
        page_meta = self.client.pages.retrieve(page_id=page_id)

        # 제목 추출
        title = self._extract_title(page_meta)

        # 마지막 수정일 추출
        last_edited_time = page_meta.get("last_edited_time", "")

        # 페이지 URL 구성
        page_url = f"https://notion.so/{page_id.replace('-', '')}"

        # 페이지 본문 블록 수집
        content = self._fetch_page_content(page_id)

        # 결과 구성
        page_data = {
            "id": page_id,
            "title": title,
            "content": content,
            "last_edited_time": last_edited_time,
            "url": page_url,
        }

        # 개인정보 마스킹 (content, title 대상)
        page_data = self.masker.mask_dict(page_data)
        # id, url, last_edited_time은 마스킹 불필요하므로 원본으로 복원
        page_data["id"] = page_id
        page_data["url"] = page_url
        page_data["last_edited_time"] = last_edited_time

        return page_data

    def _extract_title(self, page_meta: dict) -> str:
        """
        페이지 메타데이터에서 제목을 추출한다.
        Notion 페이지 제목은 properties.title 또는 properties.Name에 위치한다.
        """
        properties = page_meta.get("properties", {})

        # 제목 프로퍼티 탐색 (title 타입인 프로퍼티 찾기)
        for prop_name, prop_value in properties.items():
            if prop_value.get("type") == "title":
                title_items = prop_value.get("title", [])
                title = "".join(
                    item.get("plain_text", "") for item in title_items
                )
                if title:
                    return title

        return "(제목 없음)"

    def _fetch_page_content(self, page_id: str, depth: int = 0) -> str:
        """
        Notion 페이지의 블록을 수집하여 텍스트로 변환한다.
        depth=0일 때 child_page 블록도 1단계 깊이까지 재귀 수집한다.

        Args:
            page_id: 수집할 페이지 ID
            depth: 현재 재귀 깊이 (최대 1단계)

        Returns:
            페이지 본문 텍스트 (줄바꿈으로 구분)
        """
        text_parts: list[str] = []

        try:
            cursor = None
            while True:
                self.rate_limiter.wait()
                kwargs: dict[str, Any] = {
                    "block_id": page_id,
                    "page_size": 100,
                }
                if cursor:
                    kwargs["start_cursor"] = cursor

                response = self.client.blocks.children.list(**kwargs)

                for block in response.get("results", []):
                    block_type = block.get("type", "")

                    # child_page: depth < 1이면 재귀 수집
                    if block_type == "child_page" and depth < 1:
                        child_id = block.get("id", "")
                        if child_id:
                            child_title = block.get("child_page", {}).get("title", "")
                            if child_title:
                                text_parts.append(f"[{child_title}]")
                            child_content = self._fetch_page_content(child_id, depth=depth + 1)
                            if child_content:
                                text_parts.append(child_content)
                    else:
                        text = self._extract_block_text(block)
                        if text:
                            text_parts.append(text)

                # 페이지네이션 처리
                if not response.get("has_more"):
                    break
                cursor = response.get("next_cursor")
                if not cursor:
                    break

        except APIResponseError as e:
            logger.warning(f"페이지 {page_id} 본문 수집 실패: {e.status} - {e.code}")

        return "\n".join(text_parts)

    def _extract_block_text(self, block: dict) -> str:
        """
        Notion 블록에서 plain_text를 추출한다.
        paragraph, heading, bulleted_list_item 등 텍스트 포함 블록 타입을 처리한다.

        Args:
            block: Notion 블록 딕셔너리

        Returns:
            블록의 텍스트 내용 (없으면 빈 문자열)
        """
        block_type = block.get("type", "")

        # 텍스트를 포함하는 블록 타입 목록
        text_block_types = {
            "paragraph",
            "heading_1",
            "heading_2",
            "heading_3",
            "bulleted_list_item",
            "numbered_list_item",
            "to_do",
            "toggle",
            "quote",
            "callout",
        }

        if block_type not in text_block_types:
            return ""

        block_content = block.get(block_type, {})
        rich_text = block_content.get("rich_text", [])

        text = "".join(item.get("plain_text", "") for item in rich_text)
        return text.strip()

    def _save_json(self, data: Any, path: Path) -> None:
        """데이터를 JSON 파일로 저장한다."""
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except OSError as e:
            logger.error(f"JSON 저장 실패 ({path}): {e}")
            raise

    def __repr__(self) -> str:
        return f"NotionCollector(pages={len(self.page_ids)}개)"
