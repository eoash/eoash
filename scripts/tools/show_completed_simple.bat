@echo off
chcp 65001 > nul
cd /d "C:\Users\ash\새 폴더"

echo ========================================
echo ✅ 오늘 완료한 작업 조회 중...
echo ========================================
echo.

python scripts\show_completed_today.py

echo.
echo ========================================
echo 아무 키나 눌러 종료...
pause > nul
