# Script to download and install Miniconda
$minicondaUrl = "https://repo.anaconda.com/miniconda/Miniconda3-latest-Windows-x86_64.exe"
$installerPath = "$env:TEMP\Miniconda3-installer.exe"

Write-Host "Downloading Miniconda..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $minicondaUrl -OutFile $installerPath

Write-Host "Running Miniconda installer..." -ForegroundColor Cyan
Start-Process $installerPath -ArgumentList "/InstallationType=JustMe /RegisterPython=0 /S /D=$env:USERPROFILE\miniconda3" -Wait

Write-Host "Miniconda installed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open a NEW PowerShell window"
Write-Host "2. Run: conda init powershell"
Write-Host "3. Restart PowerShell again"
Write-Host "4. Then run: conda create -n agrismart python=3.11"
Write-Host "5. Then run: conda activate agrismart"
Write-Host "6. Then run: cd server && pip install -r requirements.txt"
Write-Host "7. Finally run: python app.py"
