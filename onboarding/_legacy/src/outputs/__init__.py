"""
outputs 패키지 (ARCH.md 기준 출력 레이어)
역할: 분석 결과를 Markdown 리포트, 온보딩 가이드, Notion 업로드, Slack 알림으로 출력하는 모듈 모음
"""

from .report_generator import ReportGenerator
from .guide_generator import GuideGenerator as OutputGuideGenerator
from .slack_notifier import SlackNotifier as OutputSlackNotifier

__all__ = ["ReportGenerator", "OutputGuideGenerator", "OutputSlackNotifier"]
