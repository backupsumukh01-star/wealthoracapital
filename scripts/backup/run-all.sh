#!/usr/bin/env bash
# Run all backups (DB + media + config).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
bash scripts/backup/backup-db.sh
bash scripts/backup/backup-media.sh
bash scripts/backup/backup-config.sh
echo "All backups complete"
