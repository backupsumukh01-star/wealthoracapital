#!/usr/bin/env bash
# Restore media archive into UPLOAD_ROOT parent.
# Usage: ./scripts/backup/restore-media.sh backups/media/growzy-media-....tar.gz
set -euo pipefail

ARCHIVE="${1:-}"
TARGET="${2:-.}"
if [[ -z "$ARCHIVE" || ! -f "$ARCHIVE" ]]; then
  echo "Usage: $0 <archive.tar.gz> [target-dir]" >&2
  exit 1
fi

tar -xzf "$ARCHIVE" -C "$TARGET"
echo "Media restored into ${TARGET}"
