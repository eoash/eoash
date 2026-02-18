"""Main thumbnail caption generation agent."""

from typing import List, Optional, Dict
from dataclasses import dataclass, asdict
from datetime import datetime
import json
from pathlib import Path

from ash_bot.integrations.claude_client import ClaudeClient
from ash_bot.core.thumbnail_evaluator import ThumbnailEvaluator, CaptionScore
from ash_bot.config import ThumbnailConfig
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class CaptionRequest:
    """Request for caption generation."""
    video_title: str
    keywords: List[str]
    target_audience: str
    video_url: Optional[str] = None
    created_by: Optional[str] = None
    timestamp: Optional[str] = None

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()


@dataclass
class CaptionResult:
    """Result of caption generation."""
    request: Dict
    generated_captions: List[str]
    scored_captions: List[Dict]
    top_5: List[Dict]
    timestamp: str
    model_used: str


class ThumbnailAgent:
    """Main agent for thumbnail caption generation and evaluation."""

    def __init__(
        self,
        claude_client: Optional[ClaudeClient] = None,
        evaluator: Optional[ThumbnailEvaluator] = None,
    ):
        """Initialize the thumbnail agent."""
        self.claude_client = claude_client or ClaudeClient()
        self.evaluator = evaluator or ThumbnailEvaluator()
        self.style_guide = ThumbnailConfig.load_style_guide()
        self.captions_dir = ThumbnailConfig.STYLE_GUIDE_PATH.parent / "captions"
        self.captions_dir.mkdir(exist_ok=True)

    def generate_captions(
        self,
        video_title: str,
        keywords: List[str],
        target_audience: str,
        video_url: Optional[str] = None,
        created_by: Optional[str] = None,
        count: int = 18
    ) -> Optional[CaptionResult]:
        """
        Generate and evaluate captions for a YouTube thumbnail.

        Args:
            video_title: 영상 제목
            keywords: 주요 키워드
            target_audience: 타겟 오디언스
            video_url: (선택) YouTube URL
            created_by: (선택) 요청자
            count: 생성할 캡션 개수

        Returns:
            CaptionResult with generated and scored captions
        """
        try:
            # Create request object
            request = CaptionRequest(
                video_title=video_title,
                keywords=keywords,
                target_audience=target_audience,
                video_url=video_url,
                created_by=created_by
            )

            logger.info(f"Generating captions for: {video_title}")

            # Step 1: Generate captions using Claude
            generated_captions = self.claude_client.generate_captions(
                video_title=video_title,
                keywords=keywords,
                target_audience=target_audience,
                style_guide=self.style_guide,
                count=count
            )

            if not generated_captions:
                logger.error("Caption generation failed")
                return None

            logger.info(f"Generated {len(generated_captions)} captions")

            # Step 2: Evaluate captions
            scored_results = self.evaluator.evaluate(generated_captions)

            # Step 3: Get top 5
            top_5_scores = scored_results[:5]

            # Create result object
            result = CaptionResult(
                request=asdict(request),
                generated_captions=generated_captions,
                scored_captions=[self._caption_score_to_dict(s) for s in scored_results],
                top_5=[self._caption_score_to_dict(s) for s in top_5_scores],
                timestamp=datetime.now().isoformat(),
                model_used="claude-opus-4-6"
            )

            # Save result
            self._save_result(result)

            return result

        except Exception as e:
            logger.error(f"Error in caption generation: {e}")
            return None

    def _caption_score_to_dict(self, score: CaptionScore) -> Dict:
        """Convert CaptionScore to dictionary."""
        return {
            "caption": score.caption,
            "ctr_potential": score.ctr_potential,
            "clarity": score.clarity,
            "brand_alignment": score.brand_alignment,
            "overall_score": score.overall_score,
            "feedback": score.feedback
        }

    def _save_result(self, result: CaptionResult) -> str:
        """Save result to JSON file."""
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"captions_{timestamp_str}.json"
        filepath = self.captions_dir / filename

        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(asdict(result), f, ensure_ascii=False, indent=2)
            logger.info(f"Result saved to: {filepath}")
            return str(filepath)
        except Exception as e:
            logger.error(f"Failed to save result: {e}")
            return ""

    def get_saved_results(self, limit: int = 10) -> List[Dict]:
        """Get recent saved caption results."""
        try:
            caption_files = sorted(
                self.captions_dir.glob("captions_*.json"),
                reverse=True
            )[:limit]

            results = []
            for filepath in caption_files:
                with open(filepath, 'r', encoding='utf-8') as f:
                    results.append(json.load(f))
            return results
        except Exception as e:
            logger.error(f"Failed to retrieve saved results: {e}")
            return []
