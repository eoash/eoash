"""
guide_generator.py
역할: 분석 결과(키워드, 공지사항, 필독 문서)와 Jinja2 템플릿을 결합하여
      신규 입사자용 온보딩 가이드 Markdown 파일(ONBOARDING_GUIDE.md)을 자동 생성한다.
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, TemplateNotFound

logger = logging.getLogger(__name__)


class GuideGenerator:
    """
    온보딩 가이드 Markdown 파일을 생성하는 클래스.
    Jinja2 템플릿을 사용하여 분석 결과를 구조화된 문서로 렌더링한다.
    """

    def __init__(self, analysis: dict[str, Any], template_path: str):
        """
        Args:
            analysis: 분석 결과 딕셔너리
                {
                    "keywords": [{"keyword": "...", "count": N}, ...],
                    "notices": [{"text": "...", "is_pinned": bool, "date": "...", "channel": "..."}, ...],
                    "must_read_pages": [{"id": "...", "title": "...", "url": "...", ...}, ...],
                    "slack_channels": ["general", "announcements", ...],
                    "workspace_name": "EO Studio",
                    "generated_at": "2026-02-24",
                }
            template_path: Jinja2 템플릿 파일 경로
        """
        self.analysis = analysis
        self.template_path = Path(template_path)

        if not self.template_path.exists():
            raise FileNotFoundError(f"템플릿 파일을 찾을 수 없습니다: {self.template_path}")

        # Jinja2 환경 설정 (템플릿 디렉토리 기준)
        self.env = Environment(
            loader=FileSystemLoader(str(self.template_path.parent)),
            autoescape=False,  # Markdown 출력이므로 HTML 이스케이프 불필요
            keep_trailing_newline=True,
        )

    def generate(self, output_path: str) -> str:
        """
        분석 결과를 템플릿에 주입하여 온보딩 가이드를 생성한다.

        Args:
            output_path: 생성할 Markdown 파일 경로

        Returns:
            생성된 파일의 절대 경로 문자열
        """
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            # 템플릿 로드
            template = self.env.get_template(self.template_path.name)
        except TemplateNotFound:
            logger.error(f"템플릿 파일을 찾을 수 없습니다: {self.template_path.name}")
            raise

        # 템플릿에 전달할 컨텍스트 구성
        context = self._build_context()

        try:
            # 렌더링
            rendered = template.render(**context)

            # 파일 저장
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(rendered)

            logger.info(f"온보딩 가이드 생성 완료: {output_file}")
            return str(output_file.resolve())

        except Exception as e:
            logger.error(f"가이드 생성 실패: {e}")
            raise

    def _build_context(self) -> dict[str, Any]:
        """
        Jinja2 템플릿에 전달할 컨텍스트 딕셔너리를 구성한다.
        분석 결과에서 필요한 데이터를 정리하고 기본값을 채운다.
        """
        keywords = self.analysis.get("keywords", [])
        notices = self.analysis.get("notices", [])
        must_read_pages = self.analysis.get("must_read_pages", [])
        slack_channels = self.analysis.get("slack_channels", [])
        workspace_name = self.analysis.get("workspace_name", "회사")
        generated_at = self.analysis.get(
            "generated_at",
            datetime.now().strftime("%Y-%m-%d")
        )

        # 키워드 목록을 쉼표 구분 문자열로도 제공
        keyword_str = ", ".join([k["keyword"] for k in keywords]) if keywords else "데이터 수집 후 자동 생성"

        return {
            "workspace_name": workspace_name,
            "generated_at": generated_at,
            "keywords": keywords,
            "keyword_str": keyword_str,
            "notices": notices,
            "must_read_pages": must_read_pages,
            "slack_channels": slack_channels,
            # 공지사항 중 핀된 것만 별도 제공
            "pinned_notices": [n for n in notices if n.get("is_pinned")],
            "recent_notices": [n for n in notices if not n.get("is_pinned")],
        }

    def generate_without_template(self, output_path: str) -> str:
        """
        템플릿 없이 분석 결과를 직접 Markdown으로 렌더링하는 폴백 메서드.
        템플릿 파일이 없을 때 사용한다.

        Args:
            output_path: 생성할 Markdown 파일 경로

        Returns:
            생성된 파일의 절대 경로 문자열
        """
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        workspace_name = self.analysis.get("workspace_name", "회사")
        generated_at = self.analysis.get("generated_at", datetime.now().strftime("%Y-%m-%d"))
        keywords = self.analysis.get("keywords", [])
        notices = self.analysis.get("notices", [])
        must_read_pages = self.analysis.get("must_read_pages", [])
        slack_channels = self.analysis.get("slack_channels", [])

        lines = [
            f"# {workspace_name} 신규 입사자 온보딩 가이드",
            f"\n> 자동 생성일: {generated_at}  ",
            "> 이 문서는 AI가 Slack과 Notion 데이터를 분석하여 자동으로 생성했습니다.\n",
            "---\n",
            "## 1. 회사 문화 핵심 키워드\n",
            "우리 조직에서 가장 자주 이야기되는 개념들입니다.\n",
        ]

        if keywords:
            for i, kw in enumerate(keywords, 1):
                lines.append(f"{i}. **{kw['keyword']}** ({kw['count']}회 언급)")
        else:
            lines.append("- (키워드 데이터 없음)")

        lines += [
            "\n---\n",
            "## 2. 최근 주요 공지사항\n",
            "최근 팀에서 중요하게 다뤄진 내용들입니다.\n",
        ]

        if notices:
            for i, notice in enumerate(notices, 1):
                pin_mark = " 📌" if notice.get("is_pinned") else ""
                lines.append(f"### {i}. {notice['date']} #{notice['channel']}{pin_mark}")
                # 텍스트 미리보기 (200자 제한)
                text_preview = notice["text"][:200]
                if len(notice["text"]) > 200:
                    text_preview += "..."
                lines.append(f"\n{text_preview}\n")
        else:
            lines.append("- (공지사항 데이터 없음)")

        lines += [
            "\n---\n",
            "## 3. 필독 Notion 문서\n",
            "먼저 읽어두면 좋은 핵심 문서입니다.\n",
        ]

        if must_read_pages:
            for i, page in enumerate(must_read_pages, 1):
                url = page.get("url", "")
                title = page.get("title", "(제목 없음)")
                last_edited = page.get("last_edited_time", "")[:10] if page.get("last_edited_time") else "알 수 없음"
                if url:
                    lines.append(f"{i}. [{title}]({url}) — 최종 수정: {last_edited}")
                else:
                    lines.append(f"{i}. **{title}** — 최종 수정: {last_edited}")
        else:
            lines.append("- (Notion 페이지 데이터 없음)")

        lines += [
            "\n---\n",
            "## 4. 알아야 할 Slack 채널\n",
        ]

        if slack_channels:
            for ch in slack_channels:
                lines.append(f"- `#{ch}`")
        else:
            lines.append("- (채널 데이터 없음)")

        lines += [
            "\n---\n",
            "## 5. 첫 2주 체크리스트\n",
            "### Week 1: 파악하기",
            "- [ ] 이 온보딩 가이드 완독",
            "- [ ] 필독 Notion 문서 3개 이상 읽기",
            "- [ ] Slack 채널 전체 가입 및 최근 메시지 훑어보기",
            "- [ ] 팀원 1:1 인사 (직속 상사 포함)",
            "- [ ] 사용하는 도구 계정 생성 완료 (Slack, Notion, GitHub 등)",
            "- [ ] 회사 정책 및 규정 문서 확인",
            "\n### Week 2: 참여하기",
            "- [ ] 첫 업무 과제 수행",
            "- [ ] 팀 미팅 참석 및 자기소개",
            "- [ ] 업무 관련 질문 목록 정리 후 담당자에게 확인",
            "- [ ] 업무 프로세스 파악 및 개선 아이디어 메모",
            "- [ ] 온보딩 가이드 피드백 제공 (HR팀에게)\n",
            "---\n",
            f"*이 문서는 {generated_at}에 자동 생성되었습니다. 내용이 부정확하면 HR팀에 알려주세요.*\n",
        ]

        content = "\n".join(lines)

        try:
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(content)
            logger.info(f"온보딩 가이드 생성 완료 (폴백 모드): {output_file}")
            return str(output_file.resolve())
        except OSError as e:
            logger.error(f"파일 저장 실패 ({output_file}): {e}")
            raise

    def __repr__(self) -> str:
        return f"GuideGenerator(template={self.template_path.name})"
