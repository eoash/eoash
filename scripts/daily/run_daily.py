#!/usr/bin/env python
"""Daily AR automation check script."""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ash_bot.main import ARAutomationSystem
from ash_bot.utils.logger import get_logger

logger = get_logger("run_daily")


def main():
    """Execute daily AR check."""
    logger.info("=" * 60)
    logger.info("Starting Daily AR Automation Check")
    logger.info("=" * 60)

    # Initialize system
    system = ARAutomationSystem(dry_run=False)

    # Run daily workflow
    result = system.run_daily_ar_check()

    # Print summary
    print("\n" + "=" * 60)
    print("DAILY AR CHECK COMPLETED")
    print("=" * 60)
    print(f"Status: {result['status']}")
    print(f"Start Time: {result['start_time']}")

    if result.get("stages"):
        print("\nStage Results:")
        for stage_name, stage_result in result["stages"].items():
            status = stage_result.get("status", "unknown")
            print(f"  {stage_name}: {status}")

    if result.get("errors"):
        print(f"\nErrors: {len(result['errors'])}")
        for error in result["errors"]:
            print(f"  - {error}")

    print("=" * 60)

    return 0 if result["status"] == "completed" else 1


if __name__ == "__main__":
    sys.exit(main())
