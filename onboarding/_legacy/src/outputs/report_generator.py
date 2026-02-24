"""
report_generator.py
역할: 분석 결과를 요약하여 Markdown 형식의 분석 요약 리포트(SUMMARY_REPORT_{YYYYMMDD}.md)를 생성한다.
      온보딩 가이드와 별개로, 관리자용 데이터 요약 리포트를 제공한다.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class ReportGenerator:
    """
    분석 결과를 관리자용 Markdown 요약 리포트로 저장하는 클래스.
    SUMMARY_REPORT_{YYYYMMDD}.md 형식으로 output/ 디렉토리에 저장한다.
    """

    def __init__(self, analysis: dict[str, Any], output_dir: str = "output"):
        """
        Args:
            analysis: 전체 분석 결과 딕셔너리
            output_dir: 리포트 저장 디렉토리
        """
        self.analysis = analysis
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate(self) -> str:
        """
        분석 요약 리포트를 생성하고 저장한다.

        Returns:
            생성된 리포트 파일의 절대 경로 문자열
        """
        today_str = datetime.now().strftime("%Y%m%d")
        output_path = self.output_dir / f"SUMMARY_REPORT_{today_str}.md"

        content = self._render_report()

        try:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(content)
            logger.info(f"분석 요약 리포트 생성 완료: {output_path}")
            return str(output_path.resolve())
        except OSError as e:
            logger.error(f"리포트 저장 실패: {e}")
            raise

    def _render_report(self) -> str:
        """분석 결과를 Markdown 텍스트로 렌더링한다."""
        generated_at = self.analysis.get("generated_at", datetime.now().strftime("%Y-%m-%d"))
        keywords = self.analysis.get("keywords", [])
        notices = self.analysis.get("notices", [])
        must_read_pages = self.analysis.get("must_read_pages", [])
        slack_channels = self.analysis.get("slack_channels", [])
        workspace_name = self.analysis.get("workspace_name", "회사")
        stats = self.analysis.get("stats", {})

        lines = [
            f"# 온보딩 데이터 분석 요약 리포트",
            f"",
            f"**생성일**: {generated_at}  ",
            f"**워크스페이스**: {workspace_name}  ",
            f"",
            "---",
            "",
            "## 수집 통계",
            "",
            f"| 항목 | 수치 |",
            f"|------|------|",
            f"| 수집된 Slack 메시지 | {stats.get('slack_messages_count', 0):,}건 |",
            f"| 수집된 Slack 채널 | {len(slack_channels)}개 |",
            f"| 수집된 Notion 페이지 | {stats.get('notion_pages_count', 0)}건 |",
            f"| 추출된 키워드 | {len(keywords)}개 |",
            f"| 추출된 공지사항 | {len(notices)}건 |",
            f"| 선정된 필독 문서 | {len(must_read_pages)}건 |",
            "",
            "---",
            "",
            "## 회사 문화 키워드 Top 10",
            "",
        ]

        if keywords:
            lines.append("| 순위 | 키워드 | 언급 횟수 |")
            lines.append("|------|--------|-----------|")
            for i, kw in enumerate(keywords, 1):
                lines.append(f"| {i} | {kw['keyword']} | {kw['count']}회 |")
        else:
            lines.append("데이터 없음")

        lines += [
            "",
            "---",
            "",
            "## 주요 공지사항",
            "",
        ]

        if notices:
            for i, notice in enumerate(notices, 1):
                pin = " [핀됨]" if notice.get("is_pinned") else ""
                lines.append(f"### {i}. {notice['date']} #{notice['channel']}{pin}")
                lines.append("")
                text_preview = notice["text"][:300]
                if len(notice["text"]) > 300:
                    text_preview += "..."
                lines.append(f"> {text_preview}")
                lines.append("")
        else:
            lines.append("데이터 없음")

        lines += [
            "",
            "---",
            "",
            "## 필독 Notion 문서",
            "",
        ]

        if must_read_pages:
            for i, page in enumerate(must_read_pages, 1):
                last_edited = page.get("last_edited_time", "")[:10] if page.get("last_edited_time") else "알 수 없음"
                url = page.get("url", "")
                title = page.get("title", "(제목 없음)")
                if url:
                    lines.append(f"{i}. [{title}]({url}) — 최종 수정: {last_edited}")
                else:
                    lines.append(f"{i}. **{title}** — 최종 수정: {last_edited}")
        else:
            lines.append("데이터 없음")

        lines += [
            "",
            "---",
            "",
            "## 수집 채널 목록",
            "",
        ]

        if slack_channels:
            for ch in slack_channels:
                lines.append(f"- `#{ch}`")
        else:
            lines.append("데이터 없음")

        lines += [
            "",
            "---",
            "",
            f"*이 리포트는 {generated_at}에 자동 생성되었습니다.*",
        ]

        return "\n".join(lines)

    def save_analysis_json(self, analyzed_dir: str = "data/analyzed") -> str:
        """
        분석 결과를 JSON 형식으로도 저장한다 (다른 시스템 연동용).

        Args:
            analyzed_dir: JSON 저장 디렉토리

        Returns:
            저장된 JSON 파일 경로
        """
        analyzed_path = Path(analyzed_dir)
        analyzed_path.mkdir(parents=True, exist_ok=True)

        today_str = datetime.now().strftime("%Y%m%d")
        json_path = analyzed_path / f"analysis_{today_str}.json"

        try:
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(self.analysis, f, ensure_ascii=False, indent=2)
            logger.info(f"분석 결과 JSON 저장 완료: {json_path}")
            return str(json_path.resolve())
        except OSError as e:
            logger.error(f"JSON 저장 실패: {e}")
            raise

    def __repr__(self) -> str:
        return f"ReportGenerator(output_dir={self.output_dir})"
