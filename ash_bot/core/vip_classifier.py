"""VIP 이메일 발신자 분류 로직."""

import json
from pathlib import Path
from typing import Dict, Tuple


_CATEGORY_MAP = {
    "investors": "investor",
    "lawyers": "lawyer",
    "accountants": "accountant",
}


class VipClassifier:
    """이메일 발신자가 VIP인지 판별하고 카테고리를 반환."""

    def __init__(self, config: Dict):
        self.config = config

    def classify(self, sender_email: str) -> Tuple[bool, str]:
        """
        VIP 발신자 여부 및 카테고리 반환.

        Returns:
            (is_vip, category) — category는 "investor", "lawyer", "accountant" 중 하나.
            VIP가 아니면 (False, "")
        """
        sender_lower = sender_email.lower()
        for config_key, category in _CATEGORY_MAP.items():
            for pattern in self.config.get(config_key, []):
                if pattern.lower() in sender_lower:
                    return True, category
        return False, ""

    @classmethod
    def from_file(cls, path: Path) -> "VipClassifier":
        """설정 파일에서 VipClassifier 생성. 파일 없거나 파싱 실패 시 빈 설정으로 생성."""
        if not path.exists():
            return cls({})
        try:
            with open(path, "r", encoding="utf-8") as f:
                return cls(json.load(f))
        except (json.JSONDecodeError, OSError):
            return cls({})
