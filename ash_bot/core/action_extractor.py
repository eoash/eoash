"""이메일 본문에서 액션 아이템 추출 로직."""

import re
from typing import Dict, List


_BODY_PATTERNS = [
    r'(.{10,50}?(?:해주세요|부탁드립니다|바랍니다))',
    r'(.{10,50}?(?:please|kindly|could you))',
]
_MAX_BODY_ACTIONS = 3


class ActionExtractor:
    """이메일 제목·본문에서 액션 아이템 추출."""

    def __init__(self, action_keywords: List[str]):
        self.action_keywords = action_keywords

    def extract(self, subject: str, body: str) -> List[str]:
        """제목과 본문에서 액션 아이템 추출."""
        actions: List[str] = []

        # 제목 키워드 매칭
        for keyword in self.action_keywords:
            if keyword in subject or keyword.lower() in subject.lower():
                actions.append(subject)
                break

        # 본문 패턴 매칭
        for pattern in _BODY_PATTERNS:
            matches = re.findall(pattern, body, re.IGNORECASE)
            for match in matches[:_MAX_BODY_ACTIONS]:
                actions.append(match.strip())

        return actions

    @classmethod
    def from_vip_config(cls, config: Dict) -> "ActionExtractor":
        """VIP 설정 딕셔너리에서 ActionExtractor 생성."""
        keywords = config.get("keywords", {}).get("action_required", [])
        return cls(action_keywords=keywords)
