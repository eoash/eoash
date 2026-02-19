"""
EO Studio - Claude Code Session Start Hook
세션 시작 시 자동 실행. stdout 출력은 Claude 컨텍스트에 주입됨.
"""

import subprocess
import sys
import io
from datetime import datetime
from pathlib import Path

# Windows 인코딩 강제 UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

PROJECT_ROOT = Path(__file__).parent.parent.parent

def get_git_log():
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "-5"],
            capture_output=True, text=True, cwd=PROJECT_ROOT
        )
        return result.stdout.strip() if result.returncode == 0 else "(git log 실패)"
    except Exception:
        return "(git 없음)"

def get_git_status():
    try:
        result = subprocess.run(
            ["git", "status", "--short"],
            capture_output=True, text=True, cwd=PROJECT_ROOT
        )
        return result.stdout.strip() if result.stdout.strip() else "변경 없음"
    except Exception:
        return "(git status 실패)"

def main():
    today = datetime.now().strftime("%Y-%m-%d %H:%M")

    print(f"""
=== EO Studio Session Start | {today} ===

[최근 커밋]
{get_git_log()}

[현재 변경 파일]
{get_git_status()}

=== 세션 시작 액션 ===
이 메시지를 읽었으면 즉시 my-context-sync 스킬을 실행하여
오늘의 Slack/Notion/Calendar/ClickUp 컨텍스트를 가져오세요.
사용자가 말하기 전에 먼저 실행합니다.
====================================
""")

if __name__ == "__main__":
    main()
