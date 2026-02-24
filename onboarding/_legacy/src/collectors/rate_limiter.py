"""
rate_limiter.py
역할: Slack API Tier 3 Rate Limit(분당 50 요청) 준수를 위한 요청 딜레이 관리
      API 호출 사이에 지정된 딜레이를 삽입하여 429 Too Many Requests 오류를 방지한다.
"""

import time
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    API Rate Limit 준수를 위한 딜레이 관리 클래스.
    Slack Tier 3 기준: 분당 50 요청 → 1.2초 딜레이로 안전하게 운영.
    """

    def __init__(self, delay_seconds: float = 1.2):
        """
        Args:
            delay_seconds: 요청 간 최소 대기 시간 (초). 기본값 1.2초 (Tier 3 기준).
        """
        self.delay_seconds = delay_seconds
        self._last_call_time: float = 0.0
        self._call_count: int = 0

    def wait(self) -> None:
        """
        마지막 API 호출 이후 충분한 시간이 지나지 않았다면 대기한다.
        첫 번째 호출은 즉시 실행된다.
        """
        now = time.monotonic()
        elapsed = now - self._last_call_time

        if self._last_call_time > 0 and elapsed < self.delay_seconds:
            wait_time = self.delay_seconds - elapsed
            logger.debug(f"Rate limit 대기: {wait_time:.2f}초")
            time.sleep(wait_time)

        self._last_call_time = time.monotonic()
        self._call_count += 1

    def reset(self) -> None:
        """딜레이 카운터를 초기화한다."""
        self._last_call_time = 0.0
        self._call_count = 0

    @property
    def call_count(self) -> int:
        """총 API 호출 횟수"""
        return self._call_count

    def __repr__(self) -> str:
        return f"RateLimiter(delay={self.delay_seconds}s, calls={self._call_count})"
