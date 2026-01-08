# =============================================================================
# VetCRM Backup Script (Windows PowerShell)
# Tworzy backup plików uploadowanych i bazy danych
#
# Użycie: .\scripts\backup.ps1
# Wymagania: Docker Desktop musi być uruchomiony
# =============================================================================

$ErrorActionPreference = "Stop"

# Konfiguracja
$BackupDir = ".\backups"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$UploadsBackup = "$BackupDir\uploads_$Date.tar.gz"
$DbBackup = "$BackupDir\database_$Date.sql"

Write-Host "=== VetCRM Backup ===" -ForegroundColor Yellow
Write-Host "Data: $(Get-Date)"
Write-Host ""

# Sprawdź czy Docker działa
try {
    docker info | Out-Null
} catch {
    Write-Host "Błąd: Docker nie jest uruchomiony!" -ForegroundColor Red
    exit 1
}

# Utwórz folder backup jeśli nie istnieje
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# 1. Backup plików uploads
Write-Host "[1/2] Backup plików uploads..." -ForegroundColor Yellow
try {
    docker exec vetcrm-backend tar -czf - -C /app uploads > $UploadsBackup
    Write-Host "✓ Pliki zapisane: $UploadsBackup" -ForegroundColor Green
} catch {
    Write-Host "Brak plików do backupu lub błąd" -ForegroundColor Yellow
}

# 2. Backup bazy danych
Write-Host "[2/2] Backup bazy danych..." -ForegroundColor Yellow
docker exec vetcrm-db mysqldump -uvetuser -pvetpassword vetcrm > $DbBackup
Write-Host "✓ Baza zapisana: $DbBackup" -ForegroundColor Green

# Podsumowanie
Write-Host ""
Write-Host "=== Backup zakończony ===" -ForegroundColor Green
Write-Host "Pliki w folderze backups:"
Get-ChildItem $BackupDir | Format-Table Name, Length, LastWriteTime

Write-Host ""
Write-Host "Wskazówka: Skopiuj backupy na zewnętrzny dysk lub cloud storage!" -ForegroundColor Cyan
