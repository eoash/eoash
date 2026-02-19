@echo off
chcp 65001 > nul
cd /d "C:\Users\ash\ash"

echo ========================================
echo 📋 투두리스트 조회 중...
echo ========================================
echo.

python scripts\show_todo.py

echo.
echo ========================================
echo 아무 키나 눌러 종료...
pause > nul
