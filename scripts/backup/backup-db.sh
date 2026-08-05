#!/usr/bin/env bash
# Automated PostgreSQL backup with retention.
# Usage: ./scripts/backup/backup-db.sh
set -euo pipefail

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILENAME="growzy-db-${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

echo "Backing up database to ${BACKUP_DIR}/${FILENAME}"
pg_dump "$DATABASE_URL" --no-owner --format=plain | gzip -c > "${BACKUP_DIR}/${FILENAME}"

# Retention
find "$BACKUP_DIR" -name 'growzy-db-*.sql.gz' -type f -mtime +"$RETENTION_DAYS" -delete

echo "Done. Size: $(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)"
