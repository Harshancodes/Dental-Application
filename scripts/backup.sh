#!/bin/bash
# Database backup script
# Run manually: bash scripts/backup.sh
# Or set up a cron job: 0 2 * * * /path/to/scripts/backup.sh
# This backs up the PostgreSQL database to a timestamped .sql.gz file

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="dental_backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting backup: $FILENAME"

# Run pg_dump inside the running postgres container, compress with gzip
docker compose exec -T db pg_dump -U admin patients | gzip > "$BACKUP_DIR/$FILENAME"

echo "Backup saved to $BACKUP_DIR/$FILENAME"

# Keep only the last 7 backups — delete older ones
find "$BACKUP_DIR" -name "dental_backup_*.sql.gz" -mtime +7 -delete
echo "Old backups cleaned up (kept last 7 days)"
