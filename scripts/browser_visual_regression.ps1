param(
    [int]$Port = 4175,
    [string]$OutputDirectory = "artifacts/browser-visual"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = Join-Path $repoRoot $OutputDirectory
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$edgeCandidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$edge = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $edge) { throw "Chromium browser was not found; install Edge or Chrome to run the visual regression audit." }

$cases = @(
    @{ Name = "home-desktop"; Query = "dpi-view=home"; Width = 1480; Height = 940 },
    @{ Name = "home-mobile"; Query = "dpi-view=home"; Width = 390; Height = 844 },
    @{ Name = "mlb-calendar-boundary"; Query = "dpi-view=mlb&audit-date=2026-08-30"; Width = 1480; Height = 940 },
    @{ Name = "settings-mobile"; Query = "dpi-view=settings"; Width = 390; Height = 844 }
)

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
    if (-not $ready) { throw "Visual audit web server did not start." }

    foreach ($case in $cases) {
        $screenshot = Join-Path $outputRoot "$($case.Name).png"
        $profile = Join-Path $env:TEMP "linelens-visual-$($case.Name)-$PID"
        $url = "$baseUrl&$($case.Query)"
        $arguments = @(
            "--headless=new",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-background-networking",
            "--no-first-run",
            "--hide-scrollbars",
            "--virtual-time-budget=12000",
            "--user-data-dir=$profile",
            "--window-size=$($case.Width),$($case.Height)",
            "--screenshot=$screenshot",
            $url
        )
        $process = Start-Process -FilePath $edge -ArgumentList $arguments -WindowStyle Hidden -PassThru
        $exited = $process.WaitForExit(30000)
        if (-not $exited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
        if (-not (Test-Path -LiteralPath $screenshot)) { throw "Edge failed to render $($case.Name)." }
        if ((Get-Item -LiteralPath $screenshot).Length -lt 10000) { throw "$($case.Name) screenshot is unexpectedly small." }
        $domPath = Join-Path $outputRoot "$($case.Name).html"
        $domArguments = @(
            "--headless=new",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-background-networking",
            "--no-first-run",
            "--virtual-time-budget=3000",
            "--user-data-dir=$profile-dom",
            "--window-size=$($case.Width),$($case.Height)",
            "--dump-dom",
            $url
        )
        $domStdout = Join-Path $outputRoot "$($case.Name).dom.stdout"
        $domStderr = Join-Path $outputRoot "$($case.Name).dom.stderr"
        $domProcess = Start-Process -FilePath $edge -ArgumentList $domArguments -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput $domStdout -RedirectStandardError $domStderr
        $domExited = $domProcess.WaitForExit(30000)
        if (-not $domExited) { Stop-Process -Id $domProcess.Id -Force -ErrorAction SilentlyContinue }
        if (Test-Path -LiteralPath $domStdout) {
            Copy-Item -LiteralPath $domStdout -Destination $domPath -Force
        } else {
            New-Item -ItemType File -Path $domPath -Force | Out-Null
        }
        $dom = Get-Content -LiteralPath $domPath -Raw
        if ($dom -match 'data-audit-overflow="fail"') { throw "$($case.Name) has horizontal document overflow." }
        Write-Host "Rendered $screenshot"
    }
} finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
}

Write-Host "Visual regression matrix PASS: $($cases.Count) cases rendered."
