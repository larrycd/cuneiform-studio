#requires -version 5.1
<#
  Cuneiform Studio - local web server (Windows PowerShell 5.1)
  by Larry Dalton
  Serves the studio from the 'app' folder next to this script at http://localhost:8768/
  Everything runs on this computer. The studio itself does all writing and reading in the browser.
#>
param(
    [int]$Port = 8768,
    [string]$Root = '',
    [switch]$Open
)
$ErrorActionPreference = 'Stop'
$Version = '1.0.3'
if (-not $Root) { $Root = Join-Path $PSScriptRoot 'app' }
$Root = [System.IO.Path]::GetFullPath($Root)
if (-not (Test-Path -LiteralPath (Join-Path $Root 'index.html'))) { throw "Cuneiform Studio files not found in $Root" }

$Mime = @{
    '.html' = 'text/html; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'; '.json' = 'application/json; charset=utf-8'
    '.tsv' = 'text/plain; charset=utf-8'; '.txt' = 'text/plain; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
    '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.ico' = 'image/x-icon'; '.ttf' = 'font/ttf'; '.md' = 'text/plain; charset=utf-8'
}

function Send-Bytes {
    param($Response, [byte[]]$Bytes, [string]$Type, [int]$Status = 200)
    $Response.StatusCode = $Status
    $Response.ContentType = $Type
    $Response.Headers['Cache-Control'] = 'no-cache'
    $Response.Headers['X-Content-Type-Options'] = 'nosniff'
    $Response.ContentLength64 = $Bytes.Length
    if ($Bytes.Length -gt 0) { $Response.OutputStream.Write($Bytes, 0, $Bytes.Length) }
}
function Send-Text {
    param($Response, [string]$Text, [string]$Type = 'text/plain; charset=utf-8', [int]$Status = 200)
    Send-Bytes -Response $Response -Bytes ([System.Text.Encoding]::UTF8.GetBytes($Text)) -Type $Type -Status $Status
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Start() }
catch { Write-Error "Cuneiform Studio could not listen on port $Port. Another program may be using it. ($($_.Exception.Message))"; exit 2 }
Write-Host "Cuneiform Studio $Version is running at http://localhost:$Port/  (Ctrl+C to stop)"
if ($Open) { Start-Process "http://localhost:$Port/" }

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request; $res = $ctx.Response
        try {
            if ($req.HttpMethod -ne 'GET' -and $req.HttpMethod -ne 'HEAD') { Send-Text $res 'Method not allowed' -Status 405; continue }
            $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
            if ($path -eq '/api/health') {
                $json = '{"name":"Cuneiform Studio","version":"' + $Version + '","author":"Larry Dalton","port":' + $Port + '}'
                Send-Text $res $json 'application/json; charset=utf-8'; continue
            }
            if ($path -eq '/' -or $path -eq '') { $path = '/index.html' }
            $rel = $path.TrimStart('/').Replace('/', '\')
            if ($rel -match '(^|\\)\.\.(\\|$)' -or $rel -match ':') { Send-Text $res 'Not found' -Status 404; continue }
            $full = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))
            if (-not $full.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
                Send-Text $res 'Not found' -Status 404; continue
            }
            $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
            $type = $Mime[$ext]; if (-not $type) { $type = 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($full)
            if ($req.HttpMethod -eq 'HEAD') { $res.ContentType = $type; $res.ContentLength64 = $bytes.Length; continue }
            Send-Bytes $res $bytes $type
        }
        catch {
            try { Send-Text $res ('Server error: ' + $_.Exception.Message) -Status 500 } catch { }
        }
        finally {
            try { $res.OutputStream.Close() } catch { }
        }
    }
}
finally {
    $listener.Stop(); $listener.Close()
}
