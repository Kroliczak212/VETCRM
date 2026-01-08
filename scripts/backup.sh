#!/bin/bash
# =============================================================================
# VetCRM Backup Script
# Tworzy backup plików uploadowanych i bazy danych
#
# Użycie: ./scripts/backup.sh
# Wymagania: Docker musi być uruchomiony
# =============================================================================

set -e

# Konfiguracja
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
UPLOADS_BACKUP="$BACKUP_DIR/uploads_$DATE.tar.gz"
DB_BACKUP="$BACKUP_DIR/database_$DATE.sql"

# Kolory
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== VetCRM Backup ===${NC}"
echo "Data: $(date)"
echo ""

# Sprawdź czy Docker działa
if ! docker info > /dev/null 2>&1; then
    echo "Błąd: Docker nie jest uruchomiony!"
    exit 1
fi

# Utwórz folder backup jeśli nie istnieje
mkdir -p "$BACKUP_DIR"

# 1. Backup plików uploads
echo -e "${YELLOW}[1/2] Backup plików uploads...${NC}"
if docker exec vetcrm-backend test -d /app/uploads 2>/dev/null; then
    docker exec vetcrm-backend tar -czf - -C /app uploads > "$UPLOADS_BACKUP"
    echo -e "${GREEN}✓ Pliki zapisane: $UPLOADS_BACKUP${NC}"
else
    echo "Brak plików do backupu (folder uploads pusty)"
fi

# 2. Backup bazy danych
echo -e "${YELLOW}[2/2] Backup bazy danych...${NC}"
docker exec vetcrm-db mysqldump -uvetuser -pvetpassword vetcrm > "$DB_BACKUP"
echo -e "${GREEN}✓ Baza zapisana: $DB_BACKUP${NC}"

# Podsumowanie
echo ""
echo -e "${GREEN}=== Backup zakończony ===${NC}"
echo "Pliki:"
ls -lh "$BACKUP_DIR"/*_$DATE* 2>/dev/null || echo "Brak plików z dzisiejszą datą"

# Opcjonalnie: usuń stare backupy (starsze niż 30 dni)
# find "$BACKUP_DIR" -type f -mtime +30 -delete

echo ""
echo "Wskazówka: Skopiuj backupy na zewnętrzny dysk lub cloud storage!"
