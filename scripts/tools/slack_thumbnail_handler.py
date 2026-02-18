#!/usr/bin/env python3
"""Slack event handler for thumbnail caption generation."""

import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from flask import Flask, request, jsonify
from slack_bolt import App
from slack_bolt.adapter.flask import SlackRequestHandler
import os
from dotenv import load_dotenv

from ash_bot.core.thumbnail_agent import ThumbnailAgent, CaptionResult
from ash_bot.core.vote_tracker import VoteTracker
from ash_bot.integrations.slack_client import SlackClient
from ash_bot.utils.logger import get_logger
import uuid


def format_caption_result_for_slack(result: CaptionResult) -> dict:
    """Format CaptionResult for Slack display with voting interface."""
    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "🎬 YouTube 썸네일 캡션 제안",
                "emoji": True
            }
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*영상 제목*\n{result.request['video_title']}"},
                {"type": "mrkdwn", "text": f"*타겟 오디언스*\n{result.request['target_audience']}"}
            ]
        },
        {"type": "divider"}
    ]

    for idx, caption_data in enumerate(result.top_5, 1):
        caption = caption_data["caption"]
        score = caption_data["overall_score"]
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*옵션 {idx}* (점수: {score:.1f})\n_{caption}_\n{caption_data['feedback']}"
            },
            "accessory": {
                "type": "button",
                "text": {"type": "plain_text", "text": "👍 선택", "emoji": True},
                "value": f"caption_{idx}",
                "action_id": f"select_caption_{idx}"
            }
        })

    blocks.append({"type": "divider"})
    blocks.append({
        "type": "context",
        "elements": [{
            "type": "mrkdwn",
            "text": f"총 {len(result.generated_captions)}개 캡션 생성됨 | 팀 스타일 가이드 기반 평가"
        }]
    })

    return {
        "blocks": blocks,
        "text": f"YouTube 썸네일 캡션: {result.request['video_title']}"
    }

load_dotenv()
logger = get_logger(__name__)

# Initialize Flask and Slack Bolt
flask_app = Flask(__name__)
slack_app = App(
    token=os.getenv("SLACK_BOT_TOKEN"),
    signing_secret=os.getenv("SLACK_SIGNING_SECRET")
)
handler = SlackRequestHandler(slack_app)

# Initialize services
thumbnail_agent = ThumbnailAgent()
slack_client = SlackClient()
vote_tracker = VoteTracker()

# Store request IDs for vote tracking
request_cache = {}


@slack_app.command("/thumbnail")
def handle_thumbnail_command(ack, body, respond):
    """Handle /thumbnail slash command."""
    ack()

    user_id = body["user_id"]
    channel_id = body["channel_id"]
    text = body.get("text", "").strip()
    thread_ts = body.get("thread_ts")  # Check if command is from a thread

    logger.info(f"Received command: text='{text}', length={len(text)}, thread_ts={thread_ts}")

    try:
        # Parse command arguments: 영상제목/키워드1,키워드2/타겟오디언스
        # Supports both with and without spaces around /
        parts = [p.strip() for p in text.split("/") if p.strip()]
        logger.info(f"Parsed parts: {parts}, count={len(parts)}")

        if len(parts) < 3:
            respond({
                "text": "❌ 사용법: `/thumbnail 영상제목/키워드1,키워드2/타겟오디언스`",
                "response_type": "ephemeral"
            })
            return

        video_title = parts[0]
        keywords = [k.strip() for k in parts[1].split(",")]
        target_audience = parts[2]
        video_url = parts[3] if len(parts) > 3 else None

        # Show processing message
        respond({
            "text": "⏳ 캡션을 생성하고 있습니다...",
            "response_type": "ephemeral"
        })

        # Generate captions
        result = thumbnail_agent.generate_captions(
            video_title=video_title,
            keywords=keywords,
            target_audience=target_audience,
            video_url=video_url,
            created_by=user_id
        )

        if not result:
            slack_client.send_message(
                channel_id,
                "❌ 캡션 생성에 실패했습니다. 다시 시도해주세요."
            )
            return

        # Generate request ID for vote tracking
        request_id = str(uuid.uuid4())[:8]
        request_cache[request_id] = {
            "result": result,
            "channel_id": channel_id,
            "captions": result.top_5
        }

        # Create brief header message for channel
        header_blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"🎬 YouTube 썸네일 캡션 제안 #{request_id}"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*영상:* {video_title}\n*타겟 오디언스:* {target_audience}\n\n💬 아래 스레드에서 캡션 옵션들을 확인하고 투표해주세요!"
                }
            }
        ]

        # If command is from a thread, post results in that thread
        # Otherwise post to channel with thread for captions
        if thread_ts:
            # Post header directly in the existing thread
            header_response = slack_app.client.chat_postMessage(
                channel=channel_id,
                thread_ts=thread_ts,
                blocks=header_blocks,
                text=f"YouTube 썸네일 캡션 제안 #{request_id}"
            )
            parent_thread_ts = thread_ts
        else:
            # Post header to channel and create thread for captions
            header_response = slack_app.client.chat_postMessage(
                channel=channel_id,
                blocks=header_blocks,
                text=f"YouTube 썸네일 캡션 제안 #{request_id}"
            )
            parent_thread_ts = header_response["ts"]

        request_cache[request_id]["message_ts"] = parent_thread_ts

        # Format full result with all 5 captions
        formatted_result = format_caption_result_for_slack(result)

        # Add request_id to blocks for tracking
        formatted_result["blocks"][0]["text"]["text"] = f"🎬 YouTube 썸네일 캡션 제안 #{request_id}"

        # Post detailed captions as thread reply
        slack_app.client.chat_postMessage(
            channel=channel_id,
            thread_ts=parent_thread_ts,
            blocks=formatted_result["blocks"],
            text=formatted_result["text"]
        )

        logger.info(f"Captions generated for: {video_title} (by {user_id}). Header TS: {header_message_ts}")

    except Exception as e:
        logger.error(f"Error handling thumbnail command: {e}")
        respond({
            "text": f"❌ 오류 발생: {str(e)}",
            "response_type": "ephemeral"
        })


@slack_app.action("select_caption_1")
@slack_app.action("select_caption_2")
@slack_app.action("select_caption_3")
@slack_app.action("select_caption_4")
@slack_app.action("select_caption_5")
def handle_caption_selection(ack, body, say):
    """Handle caption selection from vote buttons."""
    try:
        logger.info(f"Button action triggered: {body['actions'][0]['action_id']}")
        ack()

        user_id = body["user"]["id"]
        user_name = body["user"]["username"]
        channel_id = body["channel"]["id"]
        action_id = body["actions"][0]["action_id"]
        caption_num = int(action_id.replace("select_caption_", ""))
        logger.info(f"Processing button click for option {caption_num} by {user_name}")

        # Get the original message to extract caption info and request ID
        original_message = body["message"]

    except Exception as e:
        logger.error(f"Error in button handler setup: {e}", exc_info=True)
        return

    try:
        # Extract request ID, timestamp from header
        blocks = original_message.get("blocks", [])
        request_id = None
        selected_caption = None
        selected_score = None

        # Find request ID in header first
        request_id = None
        if blocks and blocks[0].get("type") == "header":
            header_text = blocks[0].get("text", {}).get("text", "")
            if "#" in header_text:
                request_id = header_text.split("#")[-1].strip()
                logger.info(f"Extracted request_id: {request_id}")

        # Get the original caption message timestamp from cache for threading
        thread_ts = None
        if request_id and request_id in request_cache:
            thread_ts = request_cache[request_id].get("message_ts")
            logger.info(f"Using caption message_ts for thread: {thread_ts}")

        # Find selected caption
        for block in blocks:
            if block.get("type") == "section" and f"옵션 {caption_num}" in block.get("text", {}).get("text", ""):
                text = block.get("text", {}).get("text", "")
                lines = text.split("\n")
                if len(lines) >= 2:
                    selected_caption = lines[1].strip().strip("_")
                    import re
                    score_match = re.search(r"([\d.]+)/100", lines[0])
                    if score_match:
                        selected_score = float(score_match.group(1))
                    logger.info(f"Extracted caption {caption_num}: {selected_caption}, score: {selected_score}")
                break

        # Save vote
        logger.info(f"Attempting to save vote - request_id: {request_id}, caption: {selected_caption}, thread_ts: {thread_ts}")
        if request_id and selected_caption:
            vote_tracker.save_vote(
                request_id=request_id,
                caption_num=caption_num,
                caption_text=selected_caption,
                user_id=user_id,
                user_name=user_name,
                score=selected_score or 0,
                channel_id=channel_id
            )
            logger.info(f"Vote saved successfully for option {caption_num}")
        else:
            logger.error(f"Vote not saved - request_id: {request_id}, caption: {selected_caption}")

        # Get vote summary
        vote_summary = vote_tracker.format_vote_summary(request_id or "unknown")

        # Post result as thread reply
        result_blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"✅ *캡션 선택 완료*\n\n*선택자:* <@{user_id}>\n*선택된 옵션:* 옵션 {caption_num}\n*캡션:* _{selected_caption}_"
                }
            },
            {
                "type": "divider"
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"📊 {vote_summary}"
                }
            }
        ]

        # Post as thread reply (not in channel directly)
        say(
            blocks=result_blocks,
            channel=channel_id,
            thread_ts=thread_ts  # Reply in thread
        )
        logger.info(f"Caption {caption_num} selected by {user_name} ({user_id}). Request ID: {request_id}")

    except Exception as e:
        logger.error(f"Error handling caption selection: {e}")
        say(f"❌ 선택 처리 중 오류 발생: {e}", channel=channel_id)


@slack_app.event("app_mention")
def handle_app_mention(body, respond):
    """Handle @app mentions."""
    text = body["event"]["text"]
    user_id = body["event"]["user"]
    channel_id = body["event"]["channel"]

    if "도움" in text or "help" in text.lower():
        help_text = """🎬 *썸네일 캡션 생성 봇*

사용법:
`/thumbnail 영상제목/키워드1,키워드2/타겟오디언스/[선택]YouTube_URL`

예시:
`/thumbnail ChatGPT 99% 활용법/ChatGPT,활용법,프롬프트/직장인,창업가`

봇이 EO Studio 팀 스타일에 맞는 썸네일 캡션 18개를 생성하고
상위 5개를 평가 점수와 함께 제시합니다.

각 캡션은 다음으로 평가됩니다:
• CTR 잠재력 (0-100)
• 명확성 (0-100)
• 브랜드 일관성 (0-100)"""

        slack_client.send_message(channel_id, help_text)
        logger.info(f"Help requested by {user_id}")


@flask_app.route("/slack/events", methods=["POST"])
def slack_events():
    """Slack events endpoint."""
    return handler.handle(request)


@flask_app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "healthy"}), 200


if __name__ == "__main__":
    # Run Flask app
    port = int(os.getenv("PORT", 3000))
    flask_app.run(host="0.0.0.0", port=port, debug=False)
