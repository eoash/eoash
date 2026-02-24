"""
slack_notifier.py
역할: 온보딩 가이드 갱신 완료 시 지정된 Slack 채널(#hr-ops)에 완료 알림 메시지를 발송한다.
      알림 메시지에는 생성 날짜, 수집 통계, 가이드 파일 경로(또는 Notion 링크)를 포함한다.
"""

import logging
from datetime import datetime
from typing import Any

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

logger = logging.getLogger(__name__)


class SlackNotifier:
    """
    Slack 채널에 완료 알림 메시지를 발송하는 클래스.
    Block Kit 형식으로 보기 좋은 알림 메시지를 구성한다.
    """

    def __init__(self, token: str, channel: str):
        """
        Args:
            token: Slack Bot Token (SLACK_BOT_TOKEN)
            channel: 알림을 발송할 채널명 (예: "hr-ops", "#hr-ops" 모두 지원)
        """
        self.client = WebClient(token=token)
        # 채널명에서 # 제거
        self.channel = channel.lstrip("#")

    def send_completion_notice(self, stats: dict[str, Any]) -> bool:
        """
        온보딩 가이드 갱신 완료 알림을 발송한다.

        Args:
            stats: 실행 통계 딕셔너리
                {
                    "generated_at": "2026-02-24",
                    "slack_messages_count": 150,
                    "notion_pages_count": 5,
                    "keywords_extracted": 10,
                    "notices_extracted": 5,
                    "guide_path": "/path/to/ONBOARDING_GUIDE.md",
                    "notion_guide_url": "https://notion.so/...",  # 선택
                    "duration_seconds": 45,
                }

        Returns:
            발송 성공 여부
        """
        try:
            message_blocks = self._build_message_blocks(stats)

            response = self.client.chat_postMessage(
                channel=f"#{self.channel}",
                blocks=message_blocks,
                text=f"온보딩 가이드 갱신 완료 ({stats.get('generated_at', '오늘')})",  # 알림 폴백 텍스트
            )

            if response.get("ok"):
                logger.info(f"Slack 완료 알림 발송 성공: #{self.channel}")
                return True
            else:
                logger.error(f"Slack 알림 발송 실패: {response.get('error', '알 수 없는 오류')}")
                return False

        except SlackApiError as e:
            logger.error(f"Slack API 오류: {e.response['error']}")
            return False
        except Exception as e:
            logger.error(f"Slack 알림 발송 중 예외 발생: {e}")
            return False

    def send_error_notice(self, error_message: str) -> bool:
        """
        실행 오류 발생 시 오류 알림을 발송한다.

        Args:
            error_message: 오류 메시지

        Returns:
            발송 성공 여부
        """
        try:
            now = datetime.now().strftime("%Y-%m-%d %H:%M")

            blocks = [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "온보딩 시스템 오류 발생",
                        "emoji": True,
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": (
                            f"*발생 시각:* {now}\n"
                            f"*오류 내용:*\n```{error_message[:1000]}```"
                        )
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": "담당자가 확인 후 수동으로 재실행하거나 GitHub Actions 로그를 점검하세요."
                        }
                    ]
                }
            ]

            response = self.client.chat_postMessage(
                channel=f"#{self.channel}",
                blocks=blocks,
                text=f"온보딩 시스템 오류 발생 ({now})",
            )

            return response.get("ok", False)

        except SlackApiError as e:
            logger.error(f"오류 알림 발송 실패 (Slack API): {e.response['error']}")
            return False
        except Exception as e:
            logger.error(f"오류 알림 발송 중 예외: {e}")
            return False

    def _build_message_blocks(self, stats: dict[str, Any]) -> list[dict]:
        """
        Block Kit 형식의 완료 알림 메시지를 구성한다.

        Args:
            stats: 실행 통계 딕셔너리

        Returns:
            Slack Block Kit 블록 목록
        """
        generated_at = stats.get("generated_at", datetime.now().strftime("%Y-%m-%d"))
        slack_count = stats.get("slack_messages_count", 0)
        notion_count = stats.get("notion_pages_count", 0)
        keyword_count = stats.get("keywords_extracted", 0)
        notice_count = stats.get("notices_extracted", 0)
        guide_path = stats.get("guide_path", "")
        notion_url = stats.get("notion_guide_url", "")
        duration = stats.get("duration_seconds", 0)

        # 가이드 링크 텍스트 구성
        guide_link_text = ""
        if notion_url:
            guide_link_text = f"\n*가이드 링크:* <{notion_url}|Notion에서 보기>"
        elif guide_path:
            guide_link_text = f"\n*로컬 파일:* `{guide_path}`"

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"신규 입사자 온보딩 가이드 갱신 완료",
                    "emoji": True,
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"*갱신 날짜:* {generated_at}\n"
                        f"*소요 시간:* {duration}초"
                        f"{guide_link_text}"
                    )
                }
            },
            {"type": "divider"},
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*수집된 Slack 메시지*\n{slack_count:,}건"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*수집된 Notion 페이지*\n{notion_count}건"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*추출된 핵심 키워드*\n{keyword_count}개"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*주요 공지사항*\n{notice_count}건"
                    },
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": (
                            "이 가이드는 AI가 자동 분석하여 생성했습니다. "
                            "내용 확인 후 신규 입사자에게 공유해 주세요."
                        )
                    }
                ]
            }
        ]

        return blocks

    def __repr__(self) -> str:
        return f"SlackNotifier(channel=#{self.channel})"
