#!/usr/bin/env bash
# Configuration backup (non-secret templates + compose + nginx).
set -euo pipefail

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-60}"
BACKUP_DIR="${BACKUP_DIR:-./backups/config}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILENAME="growzy-config-${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

tar -czf "${BACKUP_DIR}/${FILENAME}" \
  --exclude='*.pem' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.production' \
  --exclude='.env.staging' \
  docker-compose.yml \
  docker-compose.staging.yml \
  docker-compose.production.yml \
  infra/nginx \
  apps/api/.env.example \
  apps/web/.env.example \
  .env.example \
  2>/dev/null || true

find "$BACKUP_DIR" -name 'growzy-config-*.tar.gz' -type f -mtime +"$RETENTION_DAYS" -delete
echo "Config backup written: ${BACKUP_DIR}/${FILENAME}"
