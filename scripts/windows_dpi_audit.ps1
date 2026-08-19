param(
    [int]$Port = 4174,
    [string]$OutputDirectory = "artifacts/dpi",
    [string[]]$Views = @("home", "underdogs")
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = Join-Path $repoRoot $OutputDirectory
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$edgeCandidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$edge = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $edge) { throw "Microsoft Edge was not found." }

$server = Start-Process -FilePath "python" -ArgumentList @("-m", "http.server", $Port, "--directory", (Join-Path $repoRoot "dist-web")) -WindowStyle Hidden -PassThru
try {
    $baseUrl = "http://127.0.0.1:$Port/index.html?dpi-audit=1"
    $ready = $false
    foreach ($attempt in 1..30) {
        try {
            Invoke-WebRequest -UseBasicParsing -Uri $baseUrl -TimeoutSec 2 | Out-Null
            $ready = $true
            break
        } catch {
            Start-Sleep -Milliseconds 250
        }
    }
    if (-not $ready) { throw "DPI audit web server did not start." }

    foreach ($view in $Views) {
        if ($view -notin @("home", "underdogs")) { throw "Unsupported DPI audit view: $view" }
        foreach ($scale in @(1.25, 1.5)) {
            $label = [int]($scale * 100)
            $screenshot = Join-Path $outputRoot "linelens-$view-dpi-$label.png"
            if (Test-Path -LiteralPath $screenshot) { Remove-Item -LiteralPath $screenshot -Force }
            $profile = Join-Path $env:TEMP "linelens-edge-$view-dpi-$label-$PID"
            $url = "$baseUrl&dpi-view=$view"
            $arguments = @(
                "--headless=new",
                "--disable-gpu",
                "--disable-extensions",
                "--disable-background-networking",
                "--no-first-run",
                "--hide-scrollbars",
                "--virtual-time-budget=10000",
                "--user-data-dir=$profile",
                "--force-device-scale-factor=$scale",
                "--window-size=1480,940",
                "--screenshot=$screenshot",
                $url
            )
            $process = Start-Process -FilePath $edge -ArgumentList $arguments -WindowStyle Hidden -PassThru
            $exited = $process.WaitForExit(30000)
            if (-not $exited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
            if (-not (Test-Path -LiteralPath $screenshot)) {
                throw "Edge failed to render $view at $label percent DPI."
            }
            if ((Get-Item -LiteralPath $screenshot).Length -lt 10000) {
                throw "The $view $label percent DPI screenshot is unexpectedly small."
            }
            Write-Host "Rendered $screenshot"
        }
    }
} finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
}
