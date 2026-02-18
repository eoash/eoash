"""Vote tracking for thumbnail captions."""

import json
import threading
from pathlib import Path
from datetime import datetime
from typing import Dict, List
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


class VoteTracker:
    """Track and aggregate votes for thumbnail captions."""

    def __init__(self):
        """Initialize vote tracker."""
        self.votes_dir = Path(__file__).parent.parent.parent / "agent" / "memory" / "votes"
        self.votes_dir.mkdir(exist_ok=True)
        self._lock = threading.Lock()

    def save_vote(
        self,
        request_id: str,
        caption_num: int,
        caption_text: str,
        user_id: str,
        user_name: str,
        score: float,
        channel_id: str
    ) -> bool:
        """
        Save a vote for a caption.

        Args:
            request_id: Unique ID for the caption request
            caption_num: Caption option number (1-5)
            caption_text: The caption text
            user_id: Slack user ID
            user_name: Slack username
            score: Caption score
            channel_id: Slack channel ID

        Returns:
            True if successful
        """
        try:
            with self._lock:
                votes_file = self.votes_dir / f"{request_id}_votes.json"

                # Load existing votes or create new
                if votes_file.exists():
                    with open(votes_file, 'r', encoding='utf-8') as f:
                        votes_data = json.load(f)
                else:
                    votes_data = {
                        "request_id": request_id,
                        "channel_id": channel_id,
                        "captions": {},
                        "votes": [],
                        "created_at": datetime.now().isoformat()
                    }

                # Store caption info if not already there
                if str(caption_num) not in votes_data["captions"]:
                    votes_data["captions"][str(caption_num)] = {
                        "number": caption_num,
                        "text": caption_text,
                        "score": score
                    }

                # Add vote
                votes_data["votes"].append({
                    "caption_num": caption_num,
                    "user_id": user_id,
                    "user_name": user_name,
                    "timestamp": datetime.now().isoformat()
                })

                # Save
                with open(votes_file, 'w', encoding='utf-8') as f:
                    json.dump(votes_data, f, ensure_ascii=False, indent=2)

            logger.info(f"Vote saved: {request_id} - Option {caption_num} by {user_name}")
            return True

        except Exception as e:
            logger.error(f"Error saving vote: {e}")
            return False

    def get_vote_summary(self, request_id: str) -> Dict:
        """
        Get vote summary for a request.

        Args:
            request_id: Unique ID for the caption request

        Returns:
            Dictionary with vote counts and percentages
        """
        try:
            votes_file = self.votes_dir / f"{request_id}_votes.json"

            if not votes_file.exists():
                return {}

            with open(votes_file, 'r', encoding='utf-8') as f:
                votes_data = json.load(f)

            # Calculate vote counts
            vote_counts = {i: 0 for i in range(1, 6)}
            for vote in votes_data["votes"]:
                caption_num = vote["caption_num"]
                vote_counts[caption_num] = vote_counts.get(caption_num, 0) + 1

            total_votes = sum(vote_counts.values())

            # Calculate percentages
            vote_percentages = {}
            for num, count in vote_counts.items():
                if total_votes > 0:
                    percentage = (count / total_votes) * 100
                    vote_percentages[num] = {
                        "count": count,
                        "percentage": round(percentage, 1),
                        "caption": votes_data["captions"].get(str(num), {}).get("text", "")
                    }
                else:
                    vote_percentages[num] = {
                        "count": 0,
                        "percentage": 0,
                        "caption": votes_data["captions"].get(str(num), {}).get("text", "")
                    }

            return {
                "total_votes": total_votes,
                "votes_by_caption": vote_percentages,
                "captions": votes_data["captions"],
                "created_at": votes_data.get("created_at")
            }

        except Exception as e:
            logger.error(f"Error getting vote summary: {e}")
            return {}

    def format_vote_summary(self, request_id: str) -> str:
        """Format vote summary as markdown string."""
        summary = self.get_vote_summary(request_id)

        if not summary or summary["total_votes"] == 0:
            return "아직 투표가 없습니다."

        lines = []
        lines.append(f"📊 *투표 현황* (총 {summary['total_votes']}명)")
        lines.append("")

        # Sort by vote count (descending)
        sorted_votes = sorted(
            summary["votes_by_caption"].items(),
            key=lambda x: x[1]["count"],
            reverse=True
        )

        for caption_num, vote_info in sorted_votes:
            count = vote_info["count"]
            percentage = vote_info["percentage"]
            caption = vote_info["caption"][:50]  # Truncate for display

            # Create bar chart
            bar_length = int(percentage / 5)  # 20 points = 100%
            bar = "█" * bar_length + "░" * (20 - bar_length)

            lines.append(
                f"옵션 {caption_num}: {bar} {count}명 ({percentage}%)"
            )
            lines.append(f"  _{caption}_")
            lines.append("")

        return "\n".join(lines)
