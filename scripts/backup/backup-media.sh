#!/usr/bin/env bash
# Media / uploads backup with retention.
set -euo pipefail

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_DIR="${BACKUP_DIR:-./backups/media}"
UPLOAD_ROOT="${UPLOAD_ROOT:-./uploads}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILENAME="growzy-media-${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

if [[ ! -d "$UPLOAD_ROOT" ]]; then
  echo "Upload root ${UPLOAD_ROOT} missing — creating empty archive marker"
  mkdir -p "$UPLOAD_ROOT"
fi

tar -czf "${BACKUP_DIR}/${FILENAME}" -C "$(dirname "$UPLOAD_ROOT")" "$(basename "$UPLOAD_ROOT")"
find "$BACKUP_DIR" -name 'growzy-media-*.tar.gz' -type f -mtime +"$RETENTION_DAYS" -delete
echo "Media backup written: ${BACKUP_DIR}/${FILENAME}"
