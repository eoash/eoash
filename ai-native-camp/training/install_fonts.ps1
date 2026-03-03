$src = 'C:\Users\ash\ash\training\Pretendard_extracted\public\static'
$dst = 'C:\Windows\Fonts'
$regPath = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts'

Get-ChildItem $src -Filter '*.otf' | ForEach-Object {
    $dest = Join-Path $dst $_.Name
    Copy-Item $_.FullName -Destination $dest -Force
    $fontName = $_.BaseName + ' (OpenType)'
    Set-ItemProperty -Path $regPath -Name $fontName -Value $_.Name -ErrorAction SilentlyContinue
    Write-Host "설치: $($_.Name)"
}
Write-Host "완료"
