"""
EO Studio - UserPromptSubmit Hook
역할: 세션 첫 메시지에만 my-context-sync 강제 실행 지시를 Claude 컨텍스트에 주입
"""

import sys
from pathlib import Path

FLAG_FILE = Path(__file__).parent / "session_new.flag"


def main():
    if not FLAG_FILE.exists():
        # 첫 메시지 아님 - 아무것도 출력 안 함
        sys.exit(0)

    # flag 삭제 (이후 메시지엔 발동 안 함)
    FLAG_FILE.unlink()

    # Claude 컨텍스트에 강제 지시 주입
    print("""
[SYSTEM - 세션 첫 메시지 감지]
지금 즉시 my-context-sync 스킬을 실행하세요.
사용자 메시지에 답하기 전에 반드시 실행합니다.
실행 완료 후 "오늘 컨텍스트 로드 완료" 한 줄 출력 후 사용자 요청을 처리하세요.
""")


if __name__ == "__main__":
    main()
