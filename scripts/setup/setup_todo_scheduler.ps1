# Slack 투두리스트 자동 전송 스케줄러 설정
# 매일 아침 9시에 실행

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonScript = Join-Path (Split-Path -Parent $scriptDir) "scripts\send_daily_todo.py"
$projectRoot = Split-Path -Parent $scriptDir

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Slack 투두리스트 자동 전송 스케줄러 설정" -ForegroundColor Yellow
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Python 경로 확인
$pythonPath = "C:\Python314\python.exe"
if (-not (Test-Path $pythonPath)) {
    Write-Host "오류: Python을 찾을 수 없습니다: $pythonPath" -ForegroundColor Red
    Write-Host "Python 경로를 확인해주세요." -ForegroundColor Red
    exit 1
}

# 스크립트 경로 확인
if (-not (Test-Path $pythonScript)) {
    Write-Host "오류: 스크립트를 찾을 수 없습니다: $pythonScript" -ForegroundColor Red
    exit 1
}

Write-Host "Python 경로: $pythonPath" -ForegroundColor Green
Write-Host "스크립트 경로: $pythonScript" -ForegroundColor Green
Write-Host "작업 디렉토리: $projectRoot" -ForegroundColor Green
Write-Host ""

# 실행 시간 설정
$hour = Read-Host "실행 시간 (0-23, 기본 9시)"
if ([string]::IsNullOrWhiteSpace($hour)) {
    $hour = 9
}

Write-Host ""
Write-Host "매일 오전 ${hour}시에 투두리스트를 전송합니다." -ForegroundColor Yellow
Write-Host ""

# Task Scheduler 작업 생성
$taskName = "EO Studio Daily Todo"

# 기존 작업 삭제 (있는 경우)
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "기존 작업을 삭제합니다..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# 작업 생성
$action = New-ScheduledTaskAction `
    -Execute $pythonPath `
    -Argument "`"$pythonScript`"" `
    -WorkingDirectory $projectRoot

$trigger = New-ScheduledTaskTrigger -Daily -At "$($hour):00"

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType S4U

try {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "매일 아침 ClickUp 투두리스트를 Slack DM으로 전송" `
        -ErrorAction Stop

    Write-Host ""
    Write-Host "✅ 스케줄러 설정 완료!" -ForegroundColor Green
    Write-Host ""
    Write-Host "작업 이름: $taskName" -ForegroundColor Cyan
    Write-Host "실행 시간: 매일 오전 ${hour}시" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "작업 상태 확인:" -ForegroundColor Yellow
    Write-Host "  Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "수동 실행:" -ForegroundColor Yellow
    Write-Host "  Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "작업 삭제:" -ForegroundColor Yellow
    Write-Host "  Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ 스케줄러 설정 실패!" -ForegroundColor Red
    Write-Host "오류: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "관리자 권한으로 PowerShell을 실행해야 할 수 있습니다." -ForegroundColor Yellow
    exit 1
}
