# Cuneiform Studio - uninstall helper (run by the Windows uninstaller)
$ErrorActionPreference = 'SilentlyContinue'
try { Unregister-ScheduledTask -TaskName 'Cuneiform Studio - keep running' -Confirm:$false -ErrorAction Stop } catch { schtasks.exe /Delete /TN 'Cuneiform Studio - keep running' /F 2>$null | Out-Null }
Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" |
    Where-Object { $_.CommandLine -match '\\CuneiformStudio\\server\.ps1' -and $_.ProcessId -ne $PID } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Sleep -Seconds 1
$app = Join-Path $env:LOCALAPPDATA 'CuneiformStudio'
if (Test-Path $app) { Remove-Item $app -Recurse -Force }
$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'Cuneiform Studio.lnk'
if (Test-Path $lnk) { Remove-Item $lnk -Force }
