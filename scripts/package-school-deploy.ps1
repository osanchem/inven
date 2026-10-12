param(
  [string]$SchoolName = "School Lab"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseRoot = Join-Path $root "release"
$packageName = "lab-inventory-school-deploy"
$packageDir = Join-Path $releaseRoot $packageName
$zipPath = Join-Path $releaseRoot "$packageName.zip"
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
  Remove-Item -LiteralPath $packageDir -Recurse -Force
}
if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $packageDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageDir "web") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageDir "apps-script") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageDir "docs") | Out-Null

Copy-Item -Path (Join-Path $root "dist\*") -Destination (Join-Path $packageDir "web") -Recurse -Force
Copy-Item -Path (Join-Path $root "public\gsheets-backend.gs") -Destination (Join-Path $packageDir "apps-script\gsheets-backend.gs") -Force
Copy-Item -Path (Join-Path $root "docs\SCHOOL_DEPLOYMENT.md") -Destination (Join-Path $packageDir "INSTALL.md") -Force
Copy-Item -Path (Join-Path $root ".env.example") -Destination (Join-Path $packageDir "docs\.env.example") -Force

@"
# 시약장 관리 앱 — 빠른 시작 (3줄 요약)

1. Google 스프레드시트 새 파일 만들기  →  확장 프로그램 → Apps Script 열기
2. apps-script\gsheets-backend.gs 내용을 편집기에 붙여넣고 저장
   → 배포 → 새 배포 → 웹 앱 / 실행 사용자: 나 / 액세스: 모든 사용자 → 배포
   → 웹 앱 URL 복사
3. web\ 폴더를 https://app.netlify.com/drop 에 드래그 → 앱 주소 확인
   → 앱 첫 화면에서 위 URL 입력 → 연결

자세한 설명은 INSTALL.md 를 참고하세요.
"@ | Set-Content -Path (Join-Path $packageDir "README.txt") -Encoding UTF8

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
