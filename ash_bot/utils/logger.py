"""Logging utilities for AR automation system."""

import logging
import sys
from pathlib import Path
from ash_bot.config import LoggingConfig


def get_logger(name: str) -> logging.Logger:
    """Get or create a logger instance."""
    logger = logging.getLogger(name)

    # Avoid duplicate handlers
    if logger.handlers:
        return logger

    logger.setLevel(getattr(logging, LoggingConfig.LEVEL))

    # File handler
    log_file = LoggingConfig.get_log_file(name)
    Path(log_file).parent.mkdir(parents=True, exist_ok=True)

    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(getattr(logging, LoggingConfig.LEVEL))

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, LoggingConfig.LEVEL))

    # Formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger
