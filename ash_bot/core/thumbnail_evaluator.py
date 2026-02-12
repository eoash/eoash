"""Caption evaluation and scoring module for thumbnails."""

from typing import List, Dict
from dataclasses import dataclass
import re
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class CaptionScore:
    """Score result for a caption."""
    caption: str
    ctr_potential: float  # 0-100
    clarity: float  # 0-100
    brand_alignment: float  # 0-100
    overall_score: float  # 0-100
    feedback: str


class ThumbnailEvaluator:
    """Evaluate and score generated thumbnail captions."""

    # Banned expressions to avoid
    BANNED_EXPRESSIONS = [
        "금쪽이",
        "가스라이팅",
        "stanford",
        "스탠포드"
    ]

    # Positive patterns
    POSITIVE_PATTERNS = {
        "direct_appeal": [r"당신(은|이|의)", r"혹시.*\?", r"왜.*\?"],
        "problem_solution": [r"때문", r"해결", r"고쳐", r"방법"],
        "numbers": [r"\d+[가지가단계배시간%]", r"\d+개", r"5가지", r"10배", r"3단계"],
        "question": [r"\?$", r"않으신가요", r"아니신가요"],
        "emoji_friendly": [r"🔴|🟠|🟡|🟢|✅|💡|⚡|🔥"]
    }

    # Negative patterns
    NEGATIVE_PATTERNS = {
        "too_long": r".{151,}",  # More than 150 chars
        "too_short": r"^.{1,9}$",  # Less than 10 chars
        "vague": r"극소수|신기한|놀라운|대박|오마이갓",
        "overused": r"극히.*일부|극한의|한계를|한번",
    }

    def evaluate(self, captions: List[str]) -> List[CaptionScore]:
        """
        Evaluate multiple captions and return scored results.

        Args:
            captions: List of caption strings

        Returns:
            List of CaptionScore objects sorted by overall score
        """
        scores = []

        for caption in captions:
            if not caption or not isinstance(caption, str):
                continue

            score = CaptionScore(
                caption=caption,
                ctr_potential=self._score_ctr_potential(caption),
                clarity=self._score_clarity(caption),
                brand_alignment=self._score_brand_alignment(caption),
                overall_score=0.0,
                feedback=""
            )

            # Calculate overall score (weighted average)
            score.overall_score = (
                score.ctr_potential * 0.4 +
                score.clarity * 0.3 +
                score.brand_alignment * 0.3
            )

            score.feedback = self._generate_feedback(score)
            scores.append(score)

        # Sort by overall score descending
        return sorted(scores, key=lambda s: s.overall_score, reverse=True)

    def _score_ctr_potential(self, caption: str) -> float:
        """
        Score CTR potential (how likely to get clicks).

        CTR는 직접 호소, 호기심/불안감 자극, 구체적 숫자가 있을 때 높음
        """
        score = 50.0  # Base score

        # Check for direct appeal
        for pattern in self.POSITIVE_PATTERNS["direct_appeal"]:
            if re.search(pattern, caption):
                score += 10

        # Check for numbers
        if re.search(self.POSITIVE_PATTERNS["numbers"][0], caption):
            score += 15

        # Check for questions (curiosity trigger)
        if caption.endswith("?"):
            score += 10

        # Check for problem-solution framing
        problem_words = ["문제", "이유", "왜", "어떻게", "원인"]
        if any(word in caption for word in problem_words):
            score += 5

        # Penalize banned expressions
        for banned in self.BANNED_EXPRESSIONS:
            if banned.lower() in caption.lower():
                score -= 30

        # Penalize vague language
        if re.search(self.NEGATIVE_PATTERNS["vague"], caption):
            score -= 10

        return min(max(score, 0), 100)

    def _score_clarity(self, caption: str) -> float:
        """
        Score clarity (how easy to understand in 5 seconds).

        5초 안에 이해되려면 명확하고 구체적이어야 함
        """
        score = 50.0

        # Length check - optimal is 15-80 chars
        length = len(caption)
        if 15 <= length <= 80:
            score += 20
        elif 10 <= length <= 150:
            score += 10

        # Check for concrete language (specific numbers, actions)
        if re.search(r"\d+", caption):
            score += 15

        # Check for key action words
        action_words = ["해결", "고쳐", "확인", "체크", "배우", "알아"]
        if any(word in caption for word in action_words):
            score += 10

        # Penalize overly complex structures
        if caption.count(",") > 2 or caption.count("(") > 1:
            score -= 10

        # Penalize very long captions
        if length > 120:
            score -= 5

        return min(max(score, 0), 100)

    def _score_brand_alignment(self, caption: str) -> float:
        """
        Score alignment with EO Studio brand and team tone.

        팀의 톤: 직접 호소형, 질문 중심, 공감+솔루션형, 유머감각, 친근함
        """
        score = 50.0

        # Direct appeal style (팀이 70회 사용)
        if any(re.search(pattern, caption) for pattern in self.POSITIVE_PATTERNS["direct_appeal"]):
            score += 15

        # Question style
        if re.search(self.POSITIVE_PATTERNS["question"][0], caption):
            score += 10

        # Problem-solution framing
        if any(word in caption for word in ["때문", "해결", "방법"]):
            score += 10

        # Preferred numbers
        preferred_numbers = ["5가지", "10배", "3단계", "4가지", "1시간", "90%"]
        if any(num in caption for num in preferred_numbers):
            score += 15

        # Korean marketing tone indicators
        friendly_patterns = [r"당신", r"우리", r"함께", r"쉽게"]
        if any(re.search(pattern, caption) for pattern in friendly_patterns):
            score += 5

        # Penalize banned expressions
        for banned in self.BANNED_EXPRESSIONS:
            if banned.lower() in caption.lower():
                score -= 30

        # Penalize overused clichés
        if re.search(self.NEGATIVE_PATTERNS["overused"], caption):
            score -= 10

        return min(max(score, 0), 100)

    def _generate_feedback(self, score: CaptionScore) -> str:
        """Generate feedback on why this caption scored the way it did."""
        feedback_parts = []

        # Positive feedback
        if score.ctr_potential >= 70:
            feedback_parts.append("✅ CTR 잠재력 높음")
        if score.clarity >= 70:
            feedback_parts.append("✅ 명확하고 이해하기 쉬움")
        if score.brand_alignment >= 70:
            feedback_parts.append("✅ 팀 톤과 완벽히 일치")

        # Improvement feedback
        if score.ctr_potential < 60:
            feedback_parts.append("⚠️ CTR 잠재력 개선 필요")
        if score.clarity < 60:
            feedback_parts.append("⚠️ 더 명확하게 표현 필요")
        if score.brand_alignment < 60:
            feedback_parts.append("⚠️ 팀 톤에 덜 맞음")

        # Check for banned expressions
        for banned in self.BANNED_EXPRESSIONS:
            if banned.lower() in score.caption.lower():
                feedback_parts.append(f"❌ 금지 표현 포함: '{banned}'")

        return " | ".join(feedback_parts) if feedback_parts else "중립적"

    def get_top_n(self, captions: List[str], n: int = 5) -> List[CaptionScore]:
        """Get top N captions by overall score."""
        scores = self.evaluate(captions)
        return scores[:n]
