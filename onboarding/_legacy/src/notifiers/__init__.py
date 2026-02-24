"""
notifiers 패키지
역할: 완료 알림을 외부 채널(Slack)로 발송하는 모듈 모음
"""

from .slack_notifier import SlackNotifier

__all__ = ["SlackNotifier"]
