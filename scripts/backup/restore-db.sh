#!/usr/bin/env bash
# Restore PostgreSQL from a gzipped SQL dump.
# Usage: ./scripts/backup/restore-db.sh backups/postgres/growzy-db-....sql.gz
set -euo pipefail

DUMP="${1:-}"
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Usage: $0 <path-to-dump.sql.gz>" >&2
  exit 1
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

echo "WARNING: This will apply SQL from ${DUMP} against DATABASE_URL"
read -r -p "Type RESTORE to continue: " confirm
if [[ "$confirm" != "RESTORE" ]]; then
  echo "Aborted"
  exit 1
fi

gunzip -c "$DUMP" | psql "$DATABASE_URL"
echo "Restore complete"
