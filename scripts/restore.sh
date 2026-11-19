#!/usr/bin/env bash
# Restore a backup:  ./scripts/restore.sh backups/iap_2026-11-17_0200.sql.gz
set -euo pipefail
[ $# -eq 1 ] || { echo "usage: $0 backup.sql.gz"; exit 1; }
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
read -r -p "This replaces ALL current data. Type YES to continue: " a; [ "$a" = YES ] || exit 1
gunzip -c "$1" | docker compose exec -T db mysql -uroot -p"$MYSQL_ROOT_PASSWORD" iap_liaison
echo "Restored from $1"
