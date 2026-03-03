$src = 'C:\Users\ash\ash\training\Pretendard_extracted\public\static'
$dst = "$env:LOCALAPPDATA\Microsoft\Windows\Fonts"
$regPath = 'HKCU:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts'

if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst -Force | Out-Null }

Get-ChildItem $src -Filter '*.otf' | ForEach-Object {
    $dest = Join-Path $dst $_.Name
    Copy-Item $_.FullName -Destination $dest -Force
    $fontName = $_.BaseName + ' (OpenType)'
    Set-ItemProperty -Path $regPath -Name $fontName -Value $dest -ErrorAction SilentlyContinue
    Write-Host "설치: $($_.Name)"
}
Write-Host "완료"
