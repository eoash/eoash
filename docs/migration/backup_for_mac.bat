@echo off
REM Claude Code Mac 마이그레이션 백업 스크립트
REM 실행 위치: C:\Users\ash\새 폴더

echo ========================================
echo Claude Code Mac 마이그레이션 백업
echo ========================================
echo.

REM 백업 디렉토리 생성
set BACKUP_DIR=%cd%\claude_migration_backup
if exist "%BACKUP_DIR%" (
    echo 기존 백업 디렉토리를 삭제합니다...
    rmdir /s /q "%BACKUP_DIR%"
)

mkdir "%BACKUP_DIR%"
mkdir "%BACKUP_DIR%\.claude"
mkdir "%BACKUP_DIR%\.claude\projects"
mkdir "%BACKUP_DIR%\.claude\projects\memory"
mkdir "%BACKUP_DIR%\credentials"

echo.
echo [1/4] Claude Code Global 설정 백업 중...
copy "%USERPROFILE%\.claude\settings.json" "%BACKUP_DIR%\.claude\" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ settings.json 백업 완료
) else (
    echo ✗ settings.json 백업 실패
)

echo.
echo [2/4] Auto Memory 백업 중...
copy "%USERPROFILE%\.claude\projects\C--Users-ash-----\memory\MEMORY.md" "%BACKUP_DIR%\.claude\projects\memory\" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ MEMORY.md 백업 완료
) else (
    echo ✗ MEMORY.md 백업 실패
)

copy "%USERPROFILE%\.claude\projects\C--Users-ash-----\memory\AGENT_STRUCTURE_PLAN.md" "%BACKUP_DIR%\.claude\projects\memory\" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ AGENT_STRUCTURE_PLAN.md 백업 완료
) else (
    echo ✗ AGENT_STRUCTURE_PLAN.md 백업 실패
)

echo.
echo [3/4] Credentials 백업 중...
if exist ".env" (
    copy ".env" "%BACKUP_DIR%\credentials\" >nul
    echo ✓ .env 백업 완료
) else (
    echo ✗ .env 파일이 없습니다
)

if exist "credentials.json" (
    copy "credentials.json" "%BACKUP_DIR%\credentials\" >nul
    echo ✓ credentials.json 백업 완료
) else (
    echo ✗ credentials.json 파일이 없습니다
)

if exist "token.json" (
    copy "token.json" "%BACKUP_DIR%\credentials\" >nul
    echo ✓ token.json 백업 완료
) else (
    echo ✗ token.json 파일이 없습니다
)

echo.
echo [4/4] 대화 히스토리 백업 중 (선택사항)...
copy "%USERPROFILE%\.claude\history.jsonl" "%BACKUP_DIR%\.claude\" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ history.jsonl 백업 완료
) else (
    echo ⚠ history.jsonl 백업 실패 (선택사항)
)

echo.
echo ========================================
echo 백업 완료!
echo ========================================
echo.
echo 백업 위치: %BACKUP_DIR%
echo.
echo 다음 단계:
echo 1. 백업 폴더를 USB나 클라우드에 복사하세요
echo 2. migration_to_mac.md 가이드를 따라 Mac에서 복원하세요
echo.
echo ⚠️  보안 주의: credentials 폴더에는 API 키가 포함되어 있습니다!
echo.

explorer "%BACKUP_DIR%"
pause
