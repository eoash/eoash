"""
config_loader.py
역할: config.yaml 파싱 및 .env 환경변수 로드
      ConfigLoader 클래스가 설정 객체를 제공하여 다른 모듈에서 일관되게 설정을 참조할 수 있도록 한다.
"""

import os
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv


class ConfigLoader:
    """
    config.yaml과 .env 파일을 로드하여 설정값을 제공하는 클래스.
    다른 모듈은 이 클래스를 통해 API 토큰, 채널 목록, 경로 등을 참조한다.
    """

    def __init__(self, config_path: str = None, env_path: str = None):
        """
        Args:
            config_path: config.yaml 경로 (기본값: onboarding/config/config.yaml)
            env_path: .env 파일 경로 (기본값: onboarding/.env)
        """
        # onboarding/ 루트 디렉토리를 기준으로 경로 설정
        self.base_dir = Path(__file__).resolve().parent.parent

        self.config_path = Path(config_path) if config_path else self.base_dir / "config" / "config.yaml"
        self.env_path = Path(env_path) if env_path else self.base_dir / ".env"

        self._config: dict[str, Any] = {}
        self._loaded = False

    def load(self) -> "ConfigLoader":
        """설정 파일과 환경변수를 로드한다. 체이닝 지원."""
        self._load_env()
        self._load_yaml()
        self._loaded = True
        return self

    def _load_env(self) -> None:
        """
        .env 파일에서 환경변수를 로드한다.
        .env 파일이 없으면 시스템 환경변수를 그대로 사용한다.
        """
        if self.env_path.exists():
            load_dotenv(dotenv_path=self.env_path, override=True)
        else:
            # .env 파일이 없어도 시스템 환경변수로 동작 가능
            load_dotenv(override=False)

    def _load_yaml(self) -> None:
        """
        config.yaml 파일을 파싱한다.
        파일이 없거나 파싱 오류 시 ConfigError를 발생시킨다.
        """
        if not self.config_path.exists():
            raise ConfigError(f"config.yaml 파일을 찾을 수 없습니다: {self.config_path}")

        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                self._config = yaml.safe_load(f) or {}
        except yaml.YAMLError as e:
            raise ConfigError(f"config.yaml 파싱 오류: {e}") from e

    def get(self, key: str, default: Any = None) -> Any:
        """
        설정값을 반환한다. 점(.) 구분자로 중첩 키 접근 지원.
        예: config.get("slack.channels")
        """
        self._ensure_loaded()
        keys = key.split(".")
        value = self._config
        for k in keys:
            if not isinstance(value, dict):
                return default
            value = value.get(k, default)
            if value is None:
                return default
        return value

    # --- API 토큰 접근자 ---

    @property
    def slack_token(self) -> str:
        """Slack Bot Token (.env의 SLACK_BOT_TOKEN)"""
        token = os.getenv("SLACK_BOT_TOKEN", "")
        if not token:
            raise ConfigError("환경변수 SLACK_BOT_TOKEN이 설정되지 않았습니다.")
        return token

    @property
    def notion_api_key(self) -> str:
        """Notion API Key (.env의 NOTION_API_KEY)"""
        key = os.getenv("NOTION_API_KEY", "")
        if not key:
            raise ConfigError("환경변수 NOTION_API_KEY가 설정되지 않았습니다.")
        return key

    @property
    def notion_upload_page_id(self) -> str:
        """Notion 업로드 대상 페이지 ID (.env의 NOTION_UPLOAD_PAGE_ID)"""
        return os.getenv("NOTION_UPLOAD_PAGE_ID", "")

    # --- 주요 설정 접근자 ---

    @property
    def slack_channels(self) -> list[str]:
        """수집할 Slack 채널 목록"""
        return self.get("slack.channels", [])

    @property
    def slack_channel_names(self) -> dict[str, str]:
        """채널 ID → 표시 채널명 매핑 (없으면 빈 딕셔너리)"""
        return self.get("slack.channel_names", {})

    @property
    def slack_collect_days(self) -> int:
        """Slack 수집 기간 (일 단위)"""
        return int(self.get("slack.collect_days", 90))

    @property
    def slack_rate_limit_delay(self) -> float:
        """Slack API 요청 간 딜레이 (초)"""
        return float(self.get("slack.rate_limit_delay", 1.2))

    @property
    def notion_page_ids(self) -> list[str]:
        """수집할 Notion 페이지 ID 목록"""
        return self.get("notion.page_ids", [])

    @property
    def notion_workspace_name(self) -> str:
        """Notion 워크스페이스 이름"""
        return self.get("notion.workspace_name", "")

    @property
    def keyword_top_n(self) -> int:
        """키워드 추출 상위 N개"""
        return int(self.get("analysis.keyword_top_n", 10))

    @property
    def announcement_count(self) -> int:
        """주요 공지사항 추출 건수"""
        return int(self.get("analysis.announcement_count", 5))

    @property
    def must_read_count(self) -> int:
        """필독 문서 선정 건수"""
        return int(self.get("analysis.must_read_count", 5))

    @property
    def stopwords(self) -> list[str]:
        """불용어 목록"""
        return self.get("analysis.stopwords", [])

    @property
    def guide_path(self) -> Path:
        """온보딩 가이드 저장 경로 (절대 경로)"""
        relative = self.get("output.guide_path", "output/ONBOARDING_GUIDE.md")
        return self.base_dir / relative

    @property
    def notion_upload_enabled(self) -> bool:
        """Notion 자동 업로드 여부"""
        return bool(self.get("output.notion_upload", False))

    @property
    def slack_notify_channel(self) -> str:
        """완료 알림 Slack 채널명"""
        return self.get("output.slack_notify_channel", "hr-ops")

    # --- 경로 접근자 ---

    def get_path(self, name: str) -> Path:
        """paths 섹션의 경로를 절대 경로로 반환한다."""
        relative = self.get(f"paths.{name}", "")
        if not relative:
            raise ConfigError(f"paths.{name} 설정을 찾을 수 없습니다.")
        return self.base_dir / relative

    def _ensure_loaded(self) -> None:
        """로드되지 않은 경우 자동으로 로드한다."""
        if not self._loaded:
            self.load()

    def __repr__(self) -> str:
        return f"ConfigLoader(config={self.config_path}, env={self.env_path})"


class ConfigError(Exception):
    """설정 로드/접근 오류"""
    pass
