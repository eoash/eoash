# 이메일 자동화 스케줄러 설정
# 관리자 권한으로 실행 필요

param(
    [string]$pythonPath = "python",
    [string]$scriptDir = "C:\Users\ash\ash\scripts"
)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "이메일 자동화 스케줄러 설정" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. 매일 아침 이메일 요약 (09:00)
Write-Host "1. 매일 아침 이메일 요약 (09:00) 설정 중..." -ForegroundColor Yellow

$trigger1 = New-ScheduledTaskTrigger -Daily -At 09:00AM
$action1 = New-ScheduledTaskAction -Execute $pythonPath -Argument "$scriptDir\send_daily_email_summary.py" -WorkingDirectory $scriptDir
$settings1 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask `
    -TaskName "EO_DailyEmailSummary" `
    -Trigger $trigger1 `
    -Action $action1 `
    -Settings $settings1 `
    -Description "매일 아침 9시에 중요 이메일 요약 발송" `
    -Force

Write-Host "✅ 매일 아침 이메일 요약 등록 완료" -ForegroundColor Green

# 2. VIP 이메일 모니터링 (매시간)
Write-Host ""
Write-Host "2. VIP 이메일 모니터링 (매시간) 설정 중..." -ForegroundColor Yellow

$trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)
$action2 = New-ScheduledTaskAction -Execute $pythonPath -Argument "$scriptDir\monitor_vip_emails.py" -WorkingDirectory $scriptDir
$settings2 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask `
    -TaskName "EO_VIPEmailMonitor" `
    -Trigger $trigger2 `
    -Action $action2 `
    -Settings $settings2 `
    -Description "매시간 VIP 발신자 이메일 모니터링" `
    -Force

Write-Host "✅ VIP 이메일 모니터링 등록 완료" -ForegroundColor Green

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ 스케줄러 설정 완료!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "등록된 작업:" -ForegroundColor Yellow
Write-Host "  - EO_DailyEmailSummary: 매일 09:00" -ForegroundColor White
Write-Host "  - EO_VIPEmailMonitor: 매시간" -ForegroundColor White
Write-Host ""
Write-Host "확인: schtasks /query /TN EO_*" -ForegroundColor Cyan
Write-Host "삭제: schtasks /delete /TN EO_DailyEmailSummary /F" -ForegroundColor Cyan
Write-Host ""
