"""
slack_collector.py
역할: Slack API를 통해 지정된 채널의 최근 90일 메시지, 핀된 메시지, 파일 링크를 수집한다.
      수집된 데이터는 data_masker로 개인정보 마스킹 후 data/raw/slack/ 에 JSON으로 저장된다.
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from .data_masker import DataMasker
from .rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


class SlackCollector:
    """
    Slack API 수집기.
    지정된 채널의 메시지(90일 이내), 핀된 메시지, 파일 링크를 수집한다.
    Slack API Tier 3 Rate Limit을 준수하며, 수집 직후 개인정보를 마스킹한다.
    """

    def __init__(
        self,
        token: str,
        channels: list[str],
        days: int = 90,
        output_dir: str = "data/raw/slack",
        rate_limit_delay: float = 1.2,
    ):
        """
        Args:
            token: Slack Bot Token (SLACK_BOT_TOKEN)
            channels: 수집할 채널 이름 목록 (예: ["general", "announcements"])
            days: 수집 기간 (일 단위, 기본값 90일)
            output_dir: JSON 저장 디렉토리 경로
            rate_limit_delay: API 요청 간 딜레이 (초)
        """
        self.client = WebClient(token=token)
        self.channels = channels
        self.days = days
        self.output_dir = Path(output_dir)
        self.masker = DataMasker()
        self.rate_limiter = RateLimiter(delay_seconds=rate_limit_delay)

        # 출력 디렉토리 생성
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def run(self) -> dict[str, list[dict]]:
        """
        모든 지정 채널의 데이터를 수집하고 JSON으로 저장한다.

        Returns:
            채널명 -> 메시지 목록 딕셔너리
            예: {"general": [...], "announcements": [...]}
        """
        results: dict[str, list[dict]] = {}
        today_str = datetime.now().strftime("%Y%m%d")

        logger.info(f"Slack 수집 시작: {len(self.channels)}개 채널, 최근 {self.days}일")

        for channel_name in self.channels:
            try:
                logger.info(f"채널 수집 중: #{channel_name}")
                messages = self._collect_channel(channel_name)
                results[channel_name] = messages

                # JSON 파일로 저장
                output_path = self.output_dir / f"{channel_name}_{today_str}.json"
                self._save_json(messages, output_path)
                logger.info(f"  저장 완료: {output_path} ({len(messages)}건)")

            except SlackApiError as e:
                logger.error(f"채널 #{channel_name} 수집 실패 (Slack API 오류): {e.response['error']}")
            except Exception as e:
                logger.error(f"채널 #{channel_name} 수집 실패 (알 수 없는 오류): {e}")

        logger.info(f"Slack 수집 완료: 총 {sum(len(v) for v in results.values())}건")
        return results

    def _collect_channel(self, channel_name: str) -> list[dict]:
        """
        단일 채널의 메시지를 수집한다.

        Args:
            channel_name: 수집할 채널 이름

        Returns:
            마스킹 처리된 메시지 목록
        """
        # 채널 ID 조회
        channel_id = self._get_channel_id(channel_name)
        if not channel_id:
            logger.warning(f"채널 #{channel_name}을 찾을 수 없습니다. 건너뜁니다.")
            return []

        # 핀된 메시지 ID 목록 조회 (핀 여부 표시를 위해 미리 수집)
        pinned_ids = self._get_pinned_message_ids(channel_id)

        # 90일 이전 타임스탬프 계산
        cutoff_time = datetime.now(timezone.utc) - timedelta(days=self.days)
        oldest_ts = str(cutoff_time.timestamp())

        # 메시지 수집 (페이지네이션 처리)
        messages = self._fetch_messages(channel_id, oldest_ts, pinned_ids)

        return messages

    def _get_channel_id(self, channel_name: str) -> str | None:
        """채널 이름 또는 ID로 채널 ID를 반환한다."""
        # 이미 채널 ID 형식 (C로 시작하는 대문자+숫자)이면 바로 반환
        if channel_name.startswith("C") and channel_name.isupper() or (len(channel_name) > 8 and channel_name[0] == "C"):
            return channel_name
        try:
            self.rate_limiter.wait()
            response = self.client.conversations_list(
                types="public_channel",
                limit=200,
            )
            for channel in response.get("channels", []):
                if channel.get("name") == channel_name:
                    return channel["id"]

            # 페이지네이션 처리
            while response.get("response_metadata", {}).get("next_cursor"):
                self.rate_limiter.wait()
                cursor = response["response_metadata"]["next_cursor"]
                response = self.client.conversations_list(
                    types="public_channel",
                    limit=200,
                    cursor=cursor,
                )
                for channel in response.get("channels", []):
                    if channel.get("name") == channel_name:
                        return channel["id"]

        except SlackApiError as e:
            logger.error(f"채널 목록 조회 실패: {e.response['error']}")

        return None

    def _get_pinned_message_ids(self, channel_id: str) -> set[str]:
        """채널의 핀된 메시지 타임스탬프(ts) 집합을 반환한다."""
        pinned_ids: set[str] = set()
        try:
            self.rate_limiter.wait()
            response = self.client.pins_list(channel=channel_id)
            for item in response.get("items", []):
                msg = item.get("message", {})
                if msg.get("ts"):
                    pinned_ids.add(msg["ts"])
        except SlackApiError as e:
            logger.warning(f"핀 목록 조회 실패: {e.response['error']}")
        return pinned_ids

    def _fetch_messages(
        self,
        channel_id: str,
        oldest_ts: str,
        pinned_ids: set[str],
    ) -> list[dict]:
        """
        채널 메시지를 페이지네이션으로 수집하고 필요한 필드만 추출한다.

        Args:
            channel_id: Slack 채널 ID
            oldest_ts: 수집 시작 타임스탬프
            pinned_ids: 핀된 메시지 ts 집합

        Returns:
            마스킹된 메시지 목록
        """
        messages: list[dict] = []
        cursor = None

        while True:
            try:
                self.rate_limiter.wait()
                kwargs: dict[str, Any] = {
                    "channel": channel_id,
                    "oldest": oldest_ts,
                    "limit": 200,
                }
                if cursor:
                    kwargs["cursor"] = cursor

                response = self.client.conversations_history(**kwargs)

                for msg in response.get("messages", []):
                    # 봇 메시지, 채널 조인/탈퇴 메시지 제외
                    if msg.get("subtype") in ("bot_message", "channel_join", "channel_leave"):
                        continue
                    if not msg.get("text"):
                        continue

                    # 필요 필드만 추출
                    extracted = {
                        "ts": msg.get("ts", ""),
                        "text": msg.get("text", ""),
                        "is_pinned": msg.get("ts", "") in pinned_ids,
                        "has_files": bool(msg.get("files")),
                        "file_urls": [
                            f.get("permalink", "") for f in msg.get("files", [])
                        ],
                    }

                    # 개인정보 마스킹
                    extracted = self.masker.mask_dict(extracted)
                    messages.append(extracted)

                # 페이지네이션: 다음 페이지가 없으면 종료
                if not response.get("has_more"):
                    break
                cursor = response.get("response_metadata", {}).get("next_cursor")
                if not cursor:
                    break

            except SlackApiError as e:
                error = e.response.get("error", "unknown")
                if error == "ratelimited":
                    # Rate limit 초과 시 Retry-After 헤더 대기
                    retry_after = int(e.response.headers.get("Retry-After", 60))
                    logger.warning(f"Rate limit 초과. {retry_after}초 대기 후 재시도...")
                    import time
                    time.sleep(retry_after)
                    continue
                else:
                    logger.error(f"메시지 수집 중 API 오류: {error}")
                    break

        return messages

    def _save_json(self, data: Any, path: Path) -> None:
        """데이터를 JSON 파일로 저장한다."""
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except OSError as e:
            logger.error(f"JSON 저장 실패 ({path}): {e}")
            raise

    def __repr__(self) -> str:
        return f"SlackCollector(channels={self.channels}, days={self.days})"
