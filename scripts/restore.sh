#!/bin/bash
# Restore database from a backup file
# Usage: bash scripts/restore.sh backups/dental_backup_20260101_020000.sql.gz

set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: bash scripts/restore.sh <backup_file>"
    echo "Example: bash scripts/restore.sh backups/dental_backup_20260101_020000.sql.gz"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: File not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will overwrite the current database. Are you sure? (yes/no)"
read -r CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Restoring from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U admin patients
echo "Restore complete."
