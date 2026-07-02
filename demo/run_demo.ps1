# FunctionalAgro — Demo Launcher (PowerShell)
# Run from project root: .\demo\run_demo.ps1

$ROOT = Split-Path $PSScriptRoot -Parent

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     FunctionalAgro — Demo Launcher       ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# ── Check .env ────────────────────────────────────────────────────────────────
$envFile = Join-Path $ROOT ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "⚠️  .env not found. Copying from .env.example..." -ForegroundColor Yellow
    Copy-Item (Join-Path $ROOT ".env.example") $envFile
    Write-Host "   ➜ Edit .env and add your GEMINI_API_KEY before continuing." -ForegroundColor Yellow
    Write-Host ""
}

# ── Verify cache files ────────────────────────────────────────────────────────
Write-Host "🔍 Verifying cache files..." -ForegroundColor Cyan
$checks = @(
    "data\pincode_zone_crops.json",
    "data\agmarknet_cache.json",
    "models\disease_classes.json"
)
$allOk = $true
foreach ($f in $checks) {
    $path = Join-Path $ROOT $f
    if (Test-Path $path) {
        Write-Host "   ✅ $f" -ForegroundColor Green
    } else {
        Write-Host "   ❌ MISSING: $f" -ForegroundColor Red
        $allOk = $false
    }
}

if (-not $allOk) {
    Write-Host ""
    Write-Host "❌ Some files are missing. Did you run the setup steps?" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ── Seed database ─────────────────────────────────────────────────────────────
Write-Host "🌱 Seeding demo data into SQLite..." -ForegroundColor Cyan
Set-Location $ROOT
python data/seed_diagnoses.py
Write-Host ""

# ── Start backend ─────────────────────────────────────────────────────────────
Write-Host "🚀 Starting FastAPI backend on http://localhost:8000 ..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location $root
    uvicorn backend.main:app --port 8000 --reload
} -ArgumentList $ROOT

Start-Sleep -Seconds 3

# ── Start frontend ────────────────────────────────────────────────────────────
Write-Host "⚛️  Starting React frontend on http://localhost:5173 ..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location (Join-Path $root "frontend")
    npm run dev
} -ArgumentList $ROOT

Start-Sleep -Seconds 4

# ── Open browser ──────────────────────────────────────────────────────────────
Write-Host "🌐 Opening browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ FunctionalAgro is running!            ║" -ForegroundColor Green
Write-Host "║                                          ║" -ForegroundColor Green
Write-Host "║  Frontend: http://localhost:5173         ║" -ForegroundColor Green
Write-Host "║  Backend:  http://localhost:8000         ║" -ForegroundColor Green
Write-Host "║  API Docs: http://localhost:8000/docs    ║" -ForegroundColor Green
Write-Host "║                                          ║" -ForegroundColor Green
Write-Host "║  Press Ctrl+C to stop both servers.      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Wait and cleanup
try {
    Wait-Job $backendJob, $frontendJob
} finally {
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "Servers stopped." -ForegroundColor Yellow
}
