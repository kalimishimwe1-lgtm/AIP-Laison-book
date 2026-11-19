#!/usr/bin/env bash
# Daily database backup. Keeps the last 14 files in ./backups
# Cron (every night at 02:00):  0 2 * * * cd /path/to/iap-fullstack && ./scripts/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
set -a; . ./.env; set +a
f="backups/iap_$(date +%F_%H%M).sql.gz"
docker compose exec -T db mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines iap_liaison | gzip > "$f"
ls -1t backups/iap_*.sql.gz | tail -n +15 | xargs -r rm --
echo "Backup written: $f ($(du -h "$f" | cut -f1))"
