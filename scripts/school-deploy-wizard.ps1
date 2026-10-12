Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$packageScript = Join-Path $PSScriptRoot "package-school-deploy.ps1"
$releaseDir = Join-Path $root "release"
$zipPath = Join-Path $releaseDir "lab-inventory-school-deploy.zip"

function Set-UiEnabled($enabled) {
  $schoolInput.Enabled = $enabled
  $buildButton.Enabled = $enabled
  $openButton.Enabled = $enabled
}

function Add-Log($text) {
  $logBox.AppendText("[$((Get-Date).ToString('HH:mm:ss'))] $text`r`n")
  $logBox.SelectionStart = $logBox.TextLength
  $logBox.ScrollToCaret()
}

function Show-Info($message, $title) {
  [System.Windows.Forms.MessageBox]::Show($message, $title, "OK", "Information") | Out-Null
}

function Show-Warning($message, $title) {
  [System.Windows.Forms.MessageBox]::Show($message, $title, "OK", "Warning") | Out-Null
}

function Show-Error($message, $title) {
  [System.Windows.Forms.MessageBox]::Show($message, $title, "OK", "Error") | Out-Null
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "시약장 관리 앱 배포 마법사"
$form.Size = New-Object System.Drawing.Size(760, 600)
$form.StartPosition = "CenterScreen"
$form.MinimumSize = New-Object System.Drawing.Size(700, 560)
$form.BackColor = [System.Drawing.Color]::FromArgb(248, 250, 252)

$title = New-Object System.Windows.Forms.Label
$title.Text = "시약장 관리 앱 — 학교 배포 패키지 만들기"
$title.Font = New-Object System.Drawing.Font("맑은 고딕", 15, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(28, 22)
$form.Controls.Add($title)

$desc = New-Object System.Windows.Forms.Label
$desc.Text = "다른 학교에 전달할 ZIP 파일을 만듭니다. 학교명을 입력하고 버튼을 누르세요."
$desc.Font = New-Object System.Drawing.Font("맑은 고딕", 10)
$desc.AutoSize = $true
$desc.Location = New-Object System.Drawing.Point(30, 62)
$form.Controls.Add($desc)

$stepsBox = New-Object System.Windows.Forms.GroupBox
$stepsBox.Text = "이 마법사가 하는 일"
$stepsBox.Font = New-Object System.Drawing.Font("맑은 고딕", 10, [System.Drawing.FontStyle]::Bold)
$stepsBox.Location = New-Object System.Drawing.Point(30, 96)
$stepsBox.Size = New-Object System.Drawing.Size(690, 108)
$stepsBox.Anchor = "Top,Left,Right"
$form.Controls.Add($stepsBox)

$steps = New-Object System.Windows.Forms.Label
$steps.Text = "1. 학교명으로 웹 앱을 빌드합니다.`r`n2. Apps Script 백엔드 코드를 포함합니다.`r`n3. 설치 안내문과 함께 ZIP 파일로 압축합니다."
$steps.Font = New-Object System.Drawing.Font("맑은 고딕", 10)
$steps.AutoSize = $true
$steps.Location = New-Object System.Drawing.Point(18, 30)
$stepsBox.Controls.Add($steps)

$schoolLabel = New-Object System.Windows.Forms.Label
$schoolLabel.Text = "앱에 표시할 학교(실험실) 이름"
$schoolLabel.Font = New-Object System.Drawing.Font("맑은 고딕", 10, [System.Drawing.FontStyle]::Bold)
$schoolLabel.AutoSize = $true
$schoolLabel.Location = New-Object System.Drawing.Point(32, 226)
$form.Controls.Add($schoolLabel)

$schoolHint = New-Object System.Windows.Forms.Label
$schoolHint.Text = "예: 한빛고등학교 과학실  /  행복중학교 화학실"
$schoolHint.Font = New-Object System.Drawing.Font("맑은 고딕", 9)
$schoolHint.ForeColor = [System.Drawing.Color]::FromArgb(107, 114, 136)
$schoolHint.AutoSize = $true
$schoolHint.Location = New-Object System.Drawing.Point(32, 248)
$form.Controls.Add($schoolHint)

$schoolInput = New-Object System.Windows.Forms.TextBox
$schoolInput.Text = "우리 학교 과학실"
$schoolInput.Font = New-Object System.Drawing.Font("맑은 고딕", 11)
$schoolInput.Location = New-Object System.Drawing.Point(34, 272)
$schoolInput.Size = New-Object System.Drawing.Size(430, 32)
$form.Controls.Add($schoolInput)

$buildButton = New-Object System.Windows.Forms.Button
$buildButton.Text = "ZIP 패키지 만들기"
$buildButton.Font = New-Object System.Drawing.Font("맑은 고딕", 10, [System.Drawing.FontStyle]::Bold)
$buildButton.BackColor = [System.Drawing.Color]::FromArgb(23, 105, 170)
$buildButton.ForeColor = [System.Drawing.Color]::White
$buildButton.FlatStyle = "Flat"
$buildButton.Location = New-Object System.Drawing.Point(486, 270)
$buildButton.Size = New-Object System.Drawing.Size(230, 38)
$form.Controls.Add($buildButton)

$openButton = New-Object System.Windows.Forms.Button
$openButton.Text = "저장 폴더 열기"
$openButton.Font = New-Object System.Drawing.Font("맑은 고딕", 10)
$openButton.Location = New-Object System.Drawing.Point(486, 316)
$openButton.Size = New-Object System.Drawing.Size(230, 34)
$form.Controls.Add($openButton)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "준비"
$statusLabel.Font = New-Object System.Drawing.Font("맑은 고딕", 10, [System.Drawing.FontStyle]::Bold)
$statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(22, 101, 52)
$statusLabel.AutoSize = $true
$statusLabel.Location = New-Object System.Drawing.Point(34, 326)
$form.Controls.Add($statusLabel)

$hintLabel = New-Object System.Windows.Forms.Label
$hintLabel.Text = "생성 위치: release\lab-inventory-school-deploy.zip"
$hintLabel.Font = New-Object System.Drawing.Font("맑은 고딕", 9)
$hintLabel.ForeColor = [System.Drawing.Color]::FromArgb(75, 85, 101)
$hintLabel.AutoSize = $true
$hintLabel.Location = New-Object System.Drawing.Point(34, 350)
$form.Controls.Add($hintLabel)

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Multiline = $true
$logBox.ScrollBars = "Vertical"
$logBox.ReadOnly = $true
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$logBox.Location = New-Object System.Drawing.Point(34, 380)
$logBox.Size = New-Object System.Drawing.Size(682, 148)
$logBox.Anchor = "Top,Bottom,Left,Right"
$form.Controls.Add($logBox)

$footer = New-Object System.Windows.Forms.Label
$footer.Text = "ZIP 안에 포함된 것: 웹 앱 파일, Apps Script 코드, 시트 구조 안내, 설치 가이드"
$footer.Font = New-Object System.Drawing.Font("맑은 고딕", 9)
$footer.ForeColor = [System.Drawing.Color]::FromArgb(75, 85, 101)
$footer.AutoSize = $true
$footer.Location = New-Object System.Drawing.Point(34, 540)
$footer.Anchor = "Bottom,Left"
$form.Controls.Add($footer)

$openButton.Add_Click({
  if (Test-Path $releaseDir) {
    Start-Process explorer.exe $releaseDir
  } else {
    Show-Warning "아직 생성된 폴더가 없습니다. 먼저 'ZIP 패키지 만들기'를 눌러주세요." "폴더 없음"
  }
})

$buildButton.Add_Click({
  $schoolName = $schoolInput.Text.Trim()
  if ([string]::IsNullOrWhiteSpace($schoolName)) {
    Show-Warning "학교(실험실) 이름을 입력해주세요.`n예: 한빛고등학교 과학실" "이름 필요"
    return
  }

  Set-UiEnabled $false
  $statusLabel.Text = "빌드 중..."
  $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(180, 83, 9)
  $logBox.Clear()
  Add-Log "학교명: $schoolName"
  Add-Log "패키지를 생성하고 있습니다. 잠시 기다려 주세요..."

  try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "powershell.exe"
    $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$packageScript`" -SchoolName `"$schoolName`""
    $psi.WorkingDirectory = $root
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    if ($stdout.Trim()) { Add-Log $stdout.Trim() }
    if ($stderr.Trim()) { Add-Log $stderr.Trim() }

    if ($process.ExitCode -ne 0) {
      throw "패키지 생성에 실패했습니다. Node.js가 설치되어 있는지, 프로젝트 폴더가 완전한지 확인해주세요."
    }

    if (!(Test-Path $zipPath)) {
      throw "빌드는 완료되었으나 ZIP 파일을 찾을 수 없습니다."
    }

    $statusLabel.Text = "완료"
    $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(22, 101, 52)
    Add-Log "생성 완료: $zipPath"
    Show-Info "배포 패키지가 만들어졌습니다.`n`n이 ZIP 파일을 다른 학교에 전달하거나 Netlify에 업로드하세요." "완료"
    Start-Process explorer.exe "/select,`"$zipPath`""
  }
  catch {
    $statusLabel.Text = "실패"
    $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(185, 28, 28)
    Add-Log "오류: $($_.Exception.Message)"
    Show-Error "$($_.Exception.Message)`n`n계속 오류가 발생하면 Node.js 설치 여부를 확인하고 다시 시도해 주세요." "빌드 실패"
  }
  finally {
    Set-UiEnabled $true
  }
})

Add-Log "준비 완료. 학교명을 입력한 후 'ZIP 패키지 만들기'를 클릭하세요."
[void]$form.ShowDialog()
