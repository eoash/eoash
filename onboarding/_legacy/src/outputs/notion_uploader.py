"""
notion_uploader.py
역할: 생성된 온보딩 가이드(ONBOARDING_GUIDE.md)를 Notion 지정 페이지에 업로드한다.
      config.yaml의 output.notion_upload: true 설정 시 실행된다.
"""

import logging
from pathlib import Path

from notion_client import Client
from notion_client.errors import APIResponseError

logger = logging.getLogger(__name__)


class NotionUploader:
    """
    Markdown 파일을 Notion 페이지에 업로드하는 클래스.
    기존 페이지의 내용을 초기화하고 새로운 내용으로 교체한다.
    """

    def __init__(self, token: str, target_page_id: str):
        """
        Args:
            token: Notion Integration Token (NOTION_API_KEY)
            target_page_id: 업로드 대상 Notion 페이지 ID
        """
        self.client = Client(auth=token)
        self.target_page_id = target_page_id.replace("-", "")

    def upload(self, guide_path: str) -> str | None:
        """
        로컬 Markdown 파일을 Notion 페이지에 업로드한다.

        Args:
            guide_path: 업로드할 Markdown 파일 경로

        Returns:
            업로드된 Notion 페이지 URL (성공 시), None (실패 시)
        """
        guide_file = Path(guide_path)

        if not guide_file.exists():
            logger.error(f"업로드할 파일을 찾을 수 없습니다: {guide_path}")
            return None

        try:
            # 파일 내용 읽기
            with open(guide_file, "r", encoding="utf-8") as f:
                content = f.read()

            # Notion 블록으로 변환
            blocks = self._markdown_to_blocks(content)

            # 기존 페이지 내용 초기화
            self._clear_page_content()

            # 새 블록 추가 (Notion API는 한 번에 최대 100개 블록 허용)
            for i in range(0, len(blocks), 100):
                chunk = blocks[i:i + 100]
                self.client.blocks.children.append(
                    block_id=self.target_page_id,
                    children=chunk,
                )

            page_url = f"https://notion.so/{self.target_page_id}"
            logger.info(f"Notion 업로드 완료: {page_url}")
            return page_url

        except APIResponseError as e:
            logger.error(f"Notion API 오류: {e.status} - {e.code}")
            return None
        except Exception as e:
            logger.error(f"Notion 업로드 중 예외 발생: {e}")
            return None

    def _clear_page_content(self) -> None:
        """
        대상 페이지의 모든 기존 블록을 삭제한다.
        갱신 전 이전 내용을 제거하여 중복 방지한다.
        """
        try:
            response = self.client.blocks.children.list(block_id=self.target_page_id)
            for block in response.get("results", []):
                block_id = block.get("id")
                if block_id:
                    try:
                        self.client.blocks.delete(block_id=block_id)
                    except APIResponseError as e:
                        logger.warning(f"블록 삭제 실패 ({block_id}): {e.code}")
        except APIResponseError as e:
            logger.warning(f"기존 블록 목록 조회 실패: {e.code}")

    def _markdown_to_blocks(self, markdown: str) -> list[dict]:
        """
        Markdown 텍스트를 Notion 블록 리스트로 변환한다.
        완전한 Markdown 파서가 아닌, 주요 패턴만 처리하는 간이 변환기다.

        지원하는 패턴:
        - # 헤딩 1~3
        - - 또는 * 불릿 리스트
        - - [ ] 체크박스
        - > 인용구
        - ``` 코드 블록
        - 일반 텍스트 (paragraph)
        - --- 구분선

        Args:
            markdown: 변환할 Markdown 텍스트

        Returns:
            Notion Block Kit 블록 목록
        """
        blocks = []
        lines = markdown.split("\n")
        i = 0

        while i < len(lines):
            line = lines[i]

            # 코드 블록 (``` 시작)
            if line.strip().startswith("```"):
                code_lines = []
                i += 1
                while i < len(lines) and not lines[i].strip().startswith("```"):
                    code_lines.append(lines[i])
                    i += 1
                blocks.append({
                    "object": "block",
                    "type": "code",
                    "code": {
                        "rich_text": [{"type": "text", "text": {"content": "\n".join(code_lines)}}],
                        "language": "plain text",
                    }
                })
                i += 1
                continue

            # 구분선
            if line.strip() in ("---", "***", "___"):
                blocks.append({"object": "block", "type": "divider", "divider": {}})
                i += 1
                continue

            # 헤딩 1
            if line.startswith("# "):
                blocks.append(self._heading_block(1, line[2:].strip()))
                i += 1
                continue

            # 헤딩 2
            if line.startswith("## "):
                blocks.append(self._heading_block(2, line[3:].strip()))
                i += 1
                continue

            # 헤딩 3
            if line.startswith("### "):
                blocks.append(self._heading_block(3, line[4:].strip()))
                i += 1
                continue

            # 체크박스
            if line.strip().startswith("- [ ] ") or line.strip().startswith("- [x] "):
                checked = line.strip().startswith("- [x] ")
                text = line.strip()[6:].strip()
                blocks.append({
                    "object": "block",
                    "type": "to_do",
                    "to_do": {
                        "rich_text": [{"type": "text", "text": {"content": text}}],
                        "checked": checked,
                    }
                })
                i += 1
                continue

            # 불릿 리스트
            if line.strip().startswith("- ") or line.strip().startswith("* "):
                text = line.strip()[2:].strip()
                blocks.append({
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": [{"type": "text", "text": {"content": text}}],
                    }
                })
                i += 1
                continue

            # 인용구
            if line.strip().startswith("> "):
                text = line.strip()[2:].strip()
                blocks.append({
                    "object": "block",
                    "type": "quote",
                    "quote": {
                        "rich_text": [{"type": "text", "text": {"content": text}}],
                    }
                })
                i += 1
                continue

            # 일반 텍스트 (비어있는 줄 포함)
            text = line.strip()
            if text:
                blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": text}}],
                    }
                })
            i += 1

        return blocks

    def _heading_block(self, level: int, text: str) -> dict:
        """헤딩 블록을 생성한다."""
        heading_type = f"heading_{level}"
        return {
            "object": "block",
            "type": heading_type,
            heading_type: {
                "rich_text": [{"type": "text", "text": {"content": text}}],
            }
        }

    def __repr__(self) -> str:
        return f"NotionUploader(target_page={self.target_page_id})"
