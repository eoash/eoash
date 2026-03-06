"""워크플로우 실행 로그 저장."""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from ash_bot.utils.logger import get_logger

logger = get_logger(__name__)


class RunLogger:
    """워크플로우 실행 결과를 파일로 저장."""

    def __init__(self, log_dir: Path):
        self.log_dir = log_dir

    def save(self, result: Dict[str, Any], start_time: datetime) -> None:
        """실행 결과를 타임스탬프 파일 + last_run.json에 저장."""
        try:
            self.log_dir.mkdir(parents=True, exist_ok=True)
            run_log = self.log_dir / f"{start_time.strftime('%Y%m%d_%H%M%S')}_run.json"
            with open(run_log, "w") as f:
                json.dump(result, f, indent=2, default=str)
            logger.info(f"Saved run log to {run_log}")
            self._update_last_run(result)
        except Exception as e:
            logger.error(f"Error saving run log: {e}")

    def _update_last_run(self, result: Dict[str, Any]) -> None:
        last_run_file = self.log_dir / "last_run.json"
        with open(last_run_file, "w") as f:
            json.dump(
                {
                    "timestamp": datetime.now().isoformat(),
                    "workflow": result.get("workflow"),
                    "status": result.get("status"),
                    "stages": {
                        k: {"status": v.get("status")}
                        for k, v in result.get("stages", {}).items()
                    },
                },
                f,
                indent=2,
            )
        logger.info("Updated last_run.json")
