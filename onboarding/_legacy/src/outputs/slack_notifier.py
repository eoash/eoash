"""
slack_notifier.py (outputs 레이어)
역할: ARCH.md 출력 레이어에 위치하는 Slack 알림 모듈.
      src/notifiers/slack_notifier.py를 재사용하는 래퍼.
      파이프라인에서 직접 임포트하여 사용한다.
"""

# outputs 레이어에서도 동일한 SlackNotifier를 사용
# 실제 구현은 src/notifiers/slack_notifier.py에 위치
from ..notifiers.slack_notifier import SlackNotifier

__all__ = ["SlackNotifier"]
