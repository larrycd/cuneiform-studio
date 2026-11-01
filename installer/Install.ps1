#requires -version 5.1
<#
  Cuneiform Studio installer - by Larry Dalton
  Installs for the current Windows account only (no administrator rights), in %LOCALAPPDATA%\CuneiformStudio.
  Steps: back up any previous version, free port 8768 only if the previous Cuneiform Studio holds it,
  copy the files, start the server, verify it over HTTP, add a sign-in shortcut, open the studio.
  On any failure the previous version is restored. The result is written to %TEMP%\CuneiformStudio-install-result.txt.
#>
param(
    [string]$Source = '',
    [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
$Port = 8768
$Version = '1.0.0'
$ResultFile = Join-Path $env:TEMP 'CuneiformStudio-install-result.txt'
if (-not $Source) { $Source = Join-Path $PSScriptRoot 'payload' }
$App = Join-Path $env:LOCALAPPDATA 'CuneiformStudio'
$Startup = [Environment]::GetFolderPath('Startup')
$StartupLnk = Join-Path $Startup 'Cuneiform Studio.lnk'
$PsExe = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$Backup = $null

function Write-Result([string]$Text) { [System.IO.File]::WriteAllText($ResultFile, $Text, [System.Text.Encoding]::ASCII) }
function Step([string]$Text) { Write-Host ('  - ' + $Text) }
function Get-Url([string]$Url, [int]$TimeoutMs = 4000) {
    $rq = [System.Net.WebRequest]::Create($Url)
    $rq.Proxy = $null; $rq.Timeout = $TimeoutMs
    $rs = $rq.GetResponse()
    try {
        $ms = New-Object System.IO.MemoryStream
        $rs.GetResponseStream().CopyTo($ms)
        return , $ms.ToArray()
    } finally { $rs.Close() }
}
function Get-Text([string]$Url) { return [System.Text.Encoding]::UTF8.GetString((Get-Url $Url)) }
function Stop-Studio {
    Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match '\\CuneiformStudio\\server\.ps1' -and $_.ProcessId -ne $PID } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 800
}
function Test-PortFree {
    try { $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port); $l.Start(); $l.Stop(); return $true } catch { return $false }
}
function Start-Studio {
    $srv = Join-Path $App 'server.ps1'
    Start-Process -FilePath $PsExe -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', ('"' + $srv + '"')) -WindowStyle Hidden | Out-Null
}

Write-Host ''
Write-Host "Cuneiform Studio $Version installer - by Larry Dalton" -ForegroundColor Red
Write-Host ''
try {
    if ($PSVersionTable.PSVersion.Major -lt 5) { throw 'Windows PowerShell 5.1 or later is required.' }
    foreach ($f in @('server.ps1', 'app\index.html', 'app\engine.js', 'app\data\lexicon.json', 'app\data\glyphs.json', 'app\data\signs.json', 'app\data\names.tsv', 'app\fonts\NotoSansCuneiform-Regular.ttf')) {
        if (-not (Test-Path -LiteralPath (Join-Path $Source $f))) { throw "Package file missing: $f" }
    }
    Step 'Package files present'

    $hadOld = Test-Path -LiteralPath $App
    Stop-Studio
    if (-not (Test-PortFree)) { throw "Port $Port is in use by another program. Cuneiform Studio did not stop it and did not change the port." }
    Step "Port $Port is free"

    if ($hadOld) {
        $Backup = $App + '-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
        Move-Item -LiteralPath $App -Destination $Backup
        Step "Previous version backed up to $Backup"
    }
    New-Item -ItemType Directory -Path $App -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $Source 'server.ps1') -Destination $App -Force
    Copy-Item -LiteralPath (Join-Path $Source 'app') -Destination $App -Recurse -Force
    foreach ($f in @('Uninstall.ps1', 'cuneiform.ico')) { $p = Join-Path $Source $f; if (Test-Path -LiteralPath $p) { Copy-Item -LiteralPath $p -Destination $App -Force } }
    Step "Files written to $App"

    Start-Studio
    $health = $null
    for ($i = 0; $i -lt 40 -and -not $health; $i++) {
        Start-Sleep -Milliseconds 500
        try { $health = Get-Text "http://localhost:$Port/api/health" } catch { }
    }
    if (-not $health -or $health -notmatch '"Cuneiform Studio"') { throw 'The server did not start (no answer from /api/health).' }
    Step 'Server started'

    $page = Get-Text "http://localhost:$Port/"
    if ($page -notmatch 'Cuneiform Studio') { throw 'The studio page was not served correctly.' }
    $eng = Get-Text "http://localhost:$Port/engine.js"
    if ($eng -notmatch 'Cuneiform Studio engine') { throw 'The engine was not served correctly.' }
    $gl = Get-Text "http://localhost:$Port/data/glyphs.json"
    $glyphCount = ([regex]::Matches($gl, '"12[0-5][0-9A-F]{2}":\{')).Count
    if ($glyphCount -lt 1200) { throw "Sign outlines incomplete ($glyphCount signs)." }
    $lex = Get-Text "http://localhost:$Port/data/lexicon.json"
    $entries = ([regex]::Matches($lex, '\],\[')).Count + 1
    if ($entries -lt 1500) { throw "Word list incomplete ($entries entries)." }
    $sg = Get-Text "http://localhost:$Port/data/signs.json"
    if ($sg -notmatch '"LUGAL":\["\uD808\uDE17"') { throw 'Sign table incomplete.' }
    $fontLocal = (Get-Item -LiteralPath (Join-Path $App 'app\fonts\NotoSansCuneiform-Regular.ttf')).Length
    $fontServed = (Get-Url "http://localhost:$Port/fonts/NotoSansCuneiform-Regular.ttf" 15000).Length
    if ($fontLocal -ne $fontServed) { throw 'The cuneiform font was not served correctly.' }
    $names = (Get-Url "http://localhost:$Port/data/names.tsv" 15000).Length
    if ($names -lt 1000000) { throw 'Pronunciation table incomplete.' }
    $bad = $false; try { Get-Url "http://localhost:$Port/..%5Cserver.ps1" | Out-Null; $bad = $true } catch { }
    if ($bad) { throw 'The server allowed access outside the studio folder.' }
    Step "Verified over HTTP: page, engine, $glyphCount sign outlines, $entries words, sign table, font, pronunciations, folder protection"

    $ws = New-Object -ComObject WScript.Shell
    $lnk = $ws.CreateShortcut($StartupLnk)
    $lnk.TargetPath = $PsExe
    $lnk.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $App 'server.ps1') + '"'
    $lnk.WindowStyle = 7
    $lnk.Description = 'Cuneiform Studio server (http://localhost:8768/)'
    $ico = Join-Path $App 'cuneiform.ico'; if (Test-Path -LiteralPath $ico) { $lnk.IconLocation = $ico }
    $lnk.Save()
    Step 'Starts automatically when you sign in'

    Write-Result ("OK Cuneiform Studio $Version installed at http://localhost:$Port/")
    Write-Host ''
    Write-Host "Cuneiform Studio is installed and running at http://localhost:$Port/" -ForegroundColor Green
    if (-not $NoBrowser) { Start-Process "http://localhost:$Port/" }
    exit 0
}
catch {
    $msg = $_.Exception.Message
    Write-Host ''
    Write-Host ('Install failed: ' + $msg) -ForegroundColor Red
    try {
        Stop-Studio
        if ($Backup -and (Test-Path -LiteralPath $Backup)) {
            if (Test-Path -LiteralPath $App) { Remove-Item -LiteralPath $App -Recurse -Force }
            Move-Item -LiteralPath $Backup -Destination $App
            Start-Studio
            Write-Host 'The previous version has been restored.'
        }
    } catch { Write-Host ('Restore problem: ' + $_.Exception.Message) }
    Write-Result ('FAIL ' + ($msg -replace '[^\x20-\x7E]', '?'))
    exit 1
}
