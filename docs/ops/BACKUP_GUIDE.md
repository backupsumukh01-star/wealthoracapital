# Backup Guide

## Scripts

| Script | What |
|--------|------|
| `scripts/backup/backup-db.sh` | `pg_dump` → `backups/postgres/*.sql.gz` |
| `scripts/backup/backup-media.sh` | uploads tarball |
| `scripts/backup/backup-config.sh` | compose + nginx + env examples |
| `scripts/backup/run-all.sh` | all of the above |
| `scripts/backup/restore-db.sh` | restore SQL dump |
| `scripts/backup/restore-media.sh` | extract media archive |

## Environment

```bash
export DATABASE_URL=postgresql://...
export UPLOAD_ROOT=./uploads
export BACKUP_DIR=./backups/postgres   # per-script override
export BACKUP_RETENTION_DAYS=14
```

## Retention defaults

- Database: 14 days
- Media: 30 days
- Config: 60 days

## Cron example

```cron
0 2 * * * cd /opt/growzy && BACKUP_RETENTION_DAYS=14 bash scripts/backup/run-all.sh >> logs/backup.log 2>&1
```

## Verification

After each backup, confirm file size > 0 and periodically restore into a scratch database.
