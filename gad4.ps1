param(
    [switch]$RefreshPdg,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$AppArguments
)

$ErrorActionPreference = "Stop"
$rootDir = $PSScriptRoot
$settings = @{}
Get-Content (Join-Path $rootDir "tools\pdg-release.env") | ForEach-Object {
    if ($_ -match '^([A-Z0-9_]+)=(.+)$') { $settings[$matches[1]] = $matches[2] }
}

# Application identity describes this checkout, independently of the PDG pin.
$env:GALACTICA_BUILD_REVISION = $null
$env:GALACTICA_BUILD_DIRTY = $null
if (Get-Command git -ErrorAction SilentlyContinue) {
    try {
        $appRevision = & git -C $rootDir rev-parse --verify HEAD 2>$null
        if ($LASTEXITCODE -eq 0) {
            $appStatus = & git -C $rootDir status --porcelain --untracked-files=normal 2>$null
            if ($LASTEXITCODE -eq 0 -and $appRevision -match '^[0-9a-fA-F]{40}$') {
                $env:GALACTICA_BUILD_REVISION = $appRevision
                $env:GALACTICA_BUILD_DIRTY = if ($appStatus) { "true" } else { "false" }
            }
        }
    } catch { # Build identity is optional in source archives without Git.
    }
}

$appScript = Join-Path $rootDir "main.js"
if ($AppArguments.Count -gt 0 -and $AppArguments[0] -eq "--") {
    $AppArguments = @($AppArguments | Select-Object -Skip 1)
} elseif ($AppArguments.Count -gt 0 -and $AppArguments[0].EndsWith(".js")) {
    $candidate = $AppArguments[0]
    if (-not [IO.Path]::IsPathRooted($candidate)) { $candidate = Join-Path $rootDir $candidate }
    $appScript = $candidate
    $AppArguments = @($AppArguments | Select-Object -Skip 1)
}

if ($env:PDG_EXECUTABLE) {
    & $env:PDG_EXECUTABLE $appScript @AppArguments
    exit $LASTEXITCODE
}

$cacheRoot = if ($env:PDG_CACHE_DIR) { $env:PDG_CACHE_DIR } else { Join-Path $rootDir ".pdg" }
$installDir = Join-Path $cacheRoot "$($settings.PDG_VERSION)\windows-x64"
$pdgExe = Join-Path $installDir "pdg.exe"
$assetUrl = "$($settings.PDG_REPOSITORY)/releases/download/$($settings.PDG_TAG)/$($settings.PDG_WINDOWS_X64_ASSET)"

if ($RefreshPdg -and (Test-Path $installDir)) { Remove-Item $installDir -Recurse -Force }
if (-not (Test-Path $pdgExe)) {
    New-Item -ItemType Directory -Path $cacheRoot -Force | Out-Null
    $downloadFile = Join-Path $cacheRoot "pdg-download-$([guid]::NewGuid()).zip"
    $extractDir = Join-Path $cacheRoot "pdg-extract-$([guid]::NewGuid())"
    try {
        Write-Host "Downloading pinned PDG $($settings.PDG_TAG)..."
        Invoke-WebRequest -Uri $assetUrl -OutFile $downloadFile
        $actualSha = (Get-FileHash -Algorithm SHA256 $downloadFile).Hash.ToLowerInvariant()
        if ($actualSha -ne $settings.PDG_WINDOWS_X64_SHA256) {
            throw "PDG checksum mismatch: expected $($settings.PDG_WINDOWS_X64_SHA256), got $actualSha"
        }
        Expand-Archive -Path $downloadFile -DestinationPath $extractDir
        New-Item -ItemType Directory -Path (Split-Path $installDir) -Force | Out-Null
        Remove-Item $installDir -Recurse -Force -ErrorAction SilentlyContinue
        Move-Item $extractDir $installDir
    } finally {
        Remove-Item $downloadFile -Force -ErrorAction SilentlyContinue
        Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

& $pdgExe $appScript @AppArguments
exit $LASTEXITCODE
