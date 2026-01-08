# =============================================================================
# VetCRM Restore Script (Windows PowerShell)
# Przywraca backup plików i bazy danych
#
# Użycie: .\scripts\restore.ps1 -Date "20241224_120000"
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Date
)

$ErrorActionPreference = "Stop"

$BackupDir = ".\backups"
$UploadsBackup = "$BackupDir\uploads_$Date.tar.gz"
$DbBackup = "$BackupDir\database_$Date.sql"

Write-Host "=== VetCRM Restore ===" -ForegroundColor Yellow
Write-Host "Przywracanie backupu z: $Date"
Write-Host ""

# Sprawdź czy pliki istnieją
if (!(Test-Path $DbBackup)) {
    Write-Host "Błąd: Nie znaleziono backupu bazy: $DbBackup" -ForegroundColor Red
    exit 1
}

# Potwierdzenie
Write-Host "UWAGA: Ta operacja nadpisze obecne dane!" -ForegroundColor Red
$confirm = Read-Host "Czy na pewno chcesz kontynuować? (tak/nie)"
if ($confirm -ne "tak") {
    Write-Host "Anulowano."
    exit 0
}

# 1. Restore bazy danych
Write-Host "[1/2] Przywracanie bazy danych..." -ForegroundColor Yellow
Get-Content $DbBackup | docker exec -i vetcrm-db mysql -uvetuser -pvetpassword vetcrm
Write-Host "✓ Baza przywrócona" -ForegroundColor Green

# 2. Restore plików uploads
if (Test-Path $UploadsBackup) {
    Write-Host "[2/2] Przywracanie plików uploads..." -ForegroundColor Yellow
    Get-Content $UploadsBackup | docker exec -i vetcrm-backend tar -xzf - -C /app
    Write-Host "✓ Pliki przywrócone" -ForegroundColor Green
} else {
    Write-Host "[2/2] Brak backupu plików - pomijam" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Restore zakończony ===" -ForegroundColor Green
