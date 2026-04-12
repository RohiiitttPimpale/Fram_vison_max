# Helper script to start the Flask server with Python 3.11 conda environment
Write-Host "🚀 Starting Soil Smart server with Python 3.11..." -ForegroundColor Green
Write-Host ""

# Activate conda environment and start server
& "$env:USERPROFILE\miniconda3\Scripts\activate.bat" agrismart
cd server
python app.py
