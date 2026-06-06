param(
  [string]$Source = "_source\renders",
  [string]$Target = "spacetimedb-hack\public\assets\_source\renders"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Source)) {
  throw "Missing render source directory: $Source"
}

New-Item -ItemType Directory -Force -Path $Target | Out-Null
Copy-Item -Path (Join-Path $Source "*.png") -Destination $Target -Force
Write-Host "Copied renders from $Source to $Target"
