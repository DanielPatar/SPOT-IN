#!/usr/bin/env bash
# Starts a throwaway PostgreSQL 16 + PostGIS cluster for development and tests
# when Docker isn't available. Data lives in .local/pg (git-ignored).
set -euo pipefail
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
DIR="${PGDATA_DIR:-$(pwd)/.local/pg}"
PORT="${PGPORT:-5433}"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  id postgres >/dev/null 2>&1 || useradd -r -m postgres
  mkdir -p "$DIR"; chown -R postgres "$(dirname "$DIR")"
  RUN_AS=(sudo -u postgres)
  command -v sudo >/dev/null || RUN_AS=(su postgres -c)
fi
run() { if [ "${RUN_AS[0]:-}" = "su" ]; then su postgres -s /bin/bash -c "$*"; elif [ ${#RUN_AS[@]} -gt 0 ]; then "${RUN_AS[@]}" bash -c "$*"; else bash -c "$*"; fi; }
if [ ! -f "$DIR/PG_VERSION" ]; then
  run "$PGBIN/initdb -D '$DIR' -U spotin --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null"
fi
if ! run "$PGBIN/pg_ctl -D '$DIR' status" >/dev/null 2>&1; then
  run "$PGBIN/pg_ctl -D '$DIR' -o '-p $PORT -k /tmp -c listen_addresses=127.0.0.1' -l '$DIR/server.log' start -w >/dev/null"
fi
for db in spotin spotin_test; do
  psql -h 127.0.0.1 -p "$PORT" -U spotin -d postgres -tAc "select 1 from pg_database where datname='$db'" | grep -q 1 \
    || psql -h 127.0.0.1 -p "$PORT" -U spotin -d postgres -qc "create database $db"
done
echo "PostgreSQL ready on 127.0.0.1:$PORT (databases spotin, spotin_test)"
