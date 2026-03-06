"""API 설정 유효성 검사."""

from typing import List, Tuple, Type

from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


class ConfigValidator:
    """여러 Config 클래스의 validate()를 일괄 실행하고 결과를 반환."""

    def __init__(self, configs: List[Tuple[Type, str]]):
        """
        Args:
            configs: [(ConfigClass, "레이블"), ...] 형태의 검증 대상 목록
        """
        self._configs = configs

    @classmethod
    def default(cls) -> "ConfigValidator":
        """AR 자동화 기본 설정 검증기 생성."""
        from ash_bot.config import BillComConfig, PlaidConfig, SlackConfig, NotionConfig
        return cls([
            (BillComConfig, "Bill.com"),
            (PlaidConfig, "Plaid"),
            (SlackConfig, "Slack"),
            (NotionConfig, "Notion"),
        ])

    def validate_all(self) -> List[str]:
        """모든 설정 검증. 문제 목록 반환 (빈 리스트면 모두 정상)."""
        issues = []
        for config_cls, label in self._configs:
            try:
                config_cls.validate()
            except ValueError as e:
                issues.append(f"{label}: {e}")

        if issues:
            logger.warning("Configuration issues found:")
            for issue in issues:
                logger.warning(f"  - {issue}")
            logger.warning("System will continue with available services")
        else:
            logger.info("All configurations validated successfully")

        return issues
