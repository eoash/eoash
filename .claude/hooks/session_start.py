"""
EO Studio - SessionStart Hook
역할: flag 파일 생성 (첫 메시지 감지용) + 기본 프로젝트 컨텍스트 출력
"""

import subprocess
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent
FLAG_FILE = Path(__file__).parent / "session_new.flag"


def get_git_log():
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "-5"],
            capture_output=True, text=True, cwd=PROJECT_ROOT
        )
        return result.stdout.strip() if result.returncode == 0 else "(git log 실패)"
    except Exception:
        return "(git 없음)"


def main():
    # flag 파일 생성 (UserPromptSubmit 훅이 읽어서 첫 메시지 감지)
    FLAG_FILE.write_text(datetime.now().isoformat(), encoding="utf-8")

    today = datetime.now().strftime("%Y-%m-%d %H:%M")
    print(f"=== EO Studio Session Start | {today} ===")
    print()
    print("[최근 커밋]")
    print(get_git_log())
    print()


if __name__ == "__main__":
    main()
