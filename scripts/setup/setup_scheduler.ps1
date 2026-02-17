# Obsidian 자동 일기 스케줄러 설정
# PowerShell 스크립트 (관리자 권한 필요)

Write-Host "🤖 Obsidian 자동 일기 스케줄러 설정 중..." -ForegroundColor Cyan

# 배치 파일 경로 (스크립트 위치 기준으로 동적 설정)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$batPath = Join-Path $scriptDir "run_journal.bat"

Write-Host "배치 파일 경로: $batPath" -ForegroundColor Gray

if (-not (Test-Path $batPath)) {
    Write-Host ""
    Write-Host "❌ 오류: run_journal.bat 파일을 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "경로: $batPath" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✓ 배치 파일 확인 완료" -ForegroundColor Green

# 작업 명령어
$action = New-ScheduledTaskAction -Execute $batPath

# 트리거: 매일 밤 11시
$trigger = New-ScheduledTaskTrigger -Daily -At "23:00"

# 설정
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable

# 작업 등록
$taskName = "Obsidian 자동 일기"

try {
    # 기존 작업이 있으면 삭제
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

    # 새 작업 등록
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Force | Out-Null

    Write-Host ""
    Write-Host "✅ 스케줄 작업 등록 완료!" -ForegroundColor Green
    Write-Host "📅 매일 밤 11시에 자동으로 일기가 생성됩니다." -ForegroundColor Green
    Write-Host ""
    Write-Host "확인 방법:" -ForegroundColor Yellow
    Write-Host "  1. Win + R → taskschd.msc 실행" -ForegroundColor White
    Write-Host "  2. 작업 목록에서 '$taskName' 확인" -ForegroundColor White
    Write-Host ""
    Write-Host "수동 실행 테스트:" -ForegroundColor Yellow
    Write-Host "  작업 스케줄러에서 '$taskName' 우클릭 → 실행" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ 스케줄 작업 등록 실패" -ForegroundColor Red
    Write-Host "오류: $_" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "해결 방법:" -ForegroundColor Yellow
    Write-Host "  1. PowerShell을 관리자 권한으로 실행했는지 확인" -ForegroundColor White
    Write-Host "  2. README_자동일기설정.md 파일의 수동 설정 방법 참고" -ForegroundColor White
    Write-Host ""
    exit 1
}
