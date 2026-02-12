"""Claude API integration for thumbnail caption generation."""

from typing import Optional, List
import anthropic
from ash_bot.config import ClaudeConfig
from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


class ClaudeClient:
    """Claude API client for AI-powered caption generation."""

    def __init__(self):
        """Initialize Claude API client."""
        try:
            ClaudeConfig.validate()
            self.client = anthropic.Anthropic(api_key=ClaudeConfig.API_KEY)
            self.model = ClaudeConfig.MODEL
            self.max_tokens = ClaudeConfig.MAX_TOKENS
        except ValueError as e:
            logger.error(f"Claude configuration error: {e}")
            self.client = None

    def generate_captions(
        self,
        video_title: str,
        keywords: List[str],
        target_audience: str,
        style_guide: str,
        count: int = 18
    ) -> Optional[List[str]]:
        """
        Generate thumbnail caption options using Claude.

        Args:
            video_title: YouTube 영상 제목
            keywords: 주요 키워드 리스트
            target_audience: 타겟 오디언스
            style_guide: 팀 스타일 가이드
            count: 생성할 캡션 개수

        Returns:
            생성된 캡션 리스트 또는 None
        """
        if not self.client:
            logger.error("Claude client not initialized")
            return None

        try:
            prompt = self._build_prompt(
                video_title, keywords, target_audience, style_guide, count
            )

            message = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            captions = self._parse_captions(message.content[0].text)
            logger.info(f"Generated {len(captions)} captions for: {video_title}")
            return captions

        except Exception as e:
            logger.error(f"Caption generation error: {e}")
            return None

    def _build_prompt(
        self,
        video_title: str,
        keywords: List[str],
        target_audience: str,
        style_guide: str,
        count: int
    ) -> str:
        """Build Claude prompt for caption generation."""
        keywords_str = ", ".join(keywords)

        return f"""당신은 EO Studio의 YouTube 썸네일 캡션 생성 전문가입니다.

## 팀 스타일 가이드
{style_guide}

## 요청 정보
- 영상 제목: {video_title}
- 주요 키워드: {keywords_str}
- 타겟 오디언스: {target_audience}

## 작업
위의 스타일 가이드를 완벽히 따르면서 {count}개의 썸네일 캡션을 생성해주세요.

### 생성 규칙
1. 각 캡션은 한 줄로 10~150자 사이여야 합니다
2. 스타일 가이드의 추천 패턴을 활용하세요 (직접호소형, 공감+솔루션형, 질문형)
3. DO 목록의 모든 항목을 포함하세요 (숫자 활용, 직접 호소, 구체적 언어 등)
4. DON'T 목록의 금지 표현은 절대 포함하지 마세요
5. 팀이 선호하는 숫자 표현 (5가지, 10배, 3단계 등)을 적극 활용하세요

### 출력 형식
각 캡션을 다음 형식으로 생성하세요:
```
1. [캡션 텍스트]
2. [캡션 텍스트]
...
```

각 캡션만 작성하고 설명은 추가하지 마세요."""

    def _parse_captions(self, response_text: str) -> List[str]:
        """Parse Claude response to extract captions."""
        lines = response_text.strip().split('\n')
        captions = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Remove numbering (e.g., "1. ", "2. ")
            if line and line[0].isdigit() and ('. ' in line or '. ' in line):
                caption = line.split('. ', 1)[-1].strip()
                if caption and 10 <= len(caption) <= 150:
                    captions.append(caption)

        return captions
