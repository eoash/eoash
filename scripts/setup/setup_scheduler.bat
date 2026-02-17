@echo off
chcp 65001 > nul
echo 🤖 Obsidian 자동 일기 스케줄러 설정 중...

REM Python 경로 찾기 (venv가 있으면 venv 사용, 아니면 시스템 Python)
set PYTHON_PATH=python
if exist "%~dp0..\venv\Scripts\python.exe" (
    set PYTHON_PATH=%~dp0..\venv\Scripts\python.exe
)

REM 스크립트 전체 경로
set SCRIPT_PATH=%~dp0daily_journal.py

REM 작업 스케줄러에 등록
schtasks /Create /TN "Obsidian 자동 일기" /TR "\"%PYTHON_PATH%\" \"%SCRIPT_PATH%\"" /SC DAILY /ST 23:00 /F

if %errorlevel% equ 0 (
    echo ✅ 스케줄 작업 등록 완료!
    echo 📅 매일 밤 11시에 자동으로 일기가 생성됩니다.
    echo.
    echo 확인: 작업 스케줄러를 열어서 "Obsidian 자동 일기" 작업을 확인하세요.
) else (
    echo ❌ 스케줄 작업 등록 실패
    echo 💡 관리자 권한으로 다시 실행해주세요.
)

pause
