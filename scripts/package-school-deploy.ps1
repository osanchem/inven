param(
  [string]$SchoolName = "School Lab",
  [string]$PackageSuffix = ""
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseRoot = Join-Path $root "release"
if ($PackageSuffix -and $PackageSuffix -notmatch '^[-a-zA-Z0-9_]+$') {
  throw "PackageSuffix may contain only letters, numbers, hyphens, and underscores."
}
$packageName = "lab-inventory-school-deploy$PackageSuffix"
$packageDir = Join-Path $releaseRoot $packageName
$zipPath = Join-Path $releaseRoot "$packageName.zip"
if (-not $PackageSuffix -and ((Test-Path $packageDir) -or (Test-Path $zipPath))) {
  $PackageSuffix = "-" + (Get-Date -Format "yyyyMMdd-HHmmss")
  $packageName = "lab-inventory-school-deploy$PackageSuffix"
  $packageDir = Join-Path $releaseRoot $packageName
  $zipPath = Join-Path $releaseRoot "$packageName.zip"
}
$envProduction = Join-Path $root ".env.production"

Set-Location $root

$previousEnv = $null
$hadPreviousEnv = Test-Path $envProduction
if ($hadPreviousEnv) {
  $previousEnv = Get-Content -Raw -Path $envProduction
}

try {
  "VITE_SCHOOL_NAME=$SchoolName" | Set-Content -Path $envProduction -Encoding UTF8
  npm.cmd run build
}
finally {
  if ($hadPreviousEnv) {
    Set-Content -Path $envProduction -Value $previousEnv -Encoding UTF8
  }
  elseif (Test-Path $envProduction) {
    Remove-Item -LiteralPath $envProduction -Force
  }
}

if (Test-Path $packageDir) {
  throw "Package folder already exists. Choose a different PackageSuffix to preserve the existing release."
}
if (Test-Path $zipPath) {
  throw "Package archive already exists. Choose a different PackageSuffix to preserve the existing release."
}

New-Item -ItemType Directory -Path $packageDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageDir "web") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageDir "apps-script") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageDir "docs") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageDir "data") | Out-Null

Copy-Item -Path (Join-Path $root "dist\*") -Destination (Join-Path $packageDir "web") -Recurse -Force
Copy-Item -Path (Join-Path $root "public\gsheets-backend.gs") -Destination (Join-Path $packageDir "apps-script\gsheets-backend.gs") -Force
Copy-Item -Path (Join-Path $root "data\google_sheets_chemicals.csv") -Destination (Join-Path $packageDir "data\google_sheets_chemicals.csv") -Force
Copy-Item -Path (Join-Path $root "data\google_sheets_logs.csv") -Destination (Join-Path $packageDir "data\google_sheets_logs.csv") -Force
Copy-Item -Path (Join-Path $root "docs\SCHOOL_DEPLOYMENT.md") -Destination (Join-Path $packageDir "INSTALL.md") -Force
Copy-Item -Path (Join-Path $root ".env.example") -Destination (Join-Path $packageDir "docs\.env.example") -Force

Copy-Item -Path (Join-Path $packageDir "INSTALL.md") -Destination (Join-Path $packageDir "README.txt") -Force

@"
chemicals: id, name, category, unit, stock, minStock, location, hazards, msdsUrl, memo, supplier, lastUpdated, aliases, casNo
logs: id, chemicalId, chemicalName, type, amount, unit, user, purpose, note, date
experiments: id, name, description, subject, grade
experiment_chemicals: experimentId, chemicalName, amount, unit, note
"@ | Set-Content -Path (Join-Path $packageDir "docs\sheet-columns.txt") -Encoding UTF8

Compress-Archive -Path (Join-Path $packageDir "*") -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "School deployment package created:"
Write-Host "  Folder: $packageDir"
Write-Host "  Zip:    $zipPath"
