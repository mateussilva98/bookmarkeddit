#!/bin/sh
# Entrypoint script for Plausible to inject secrets into DATABASE_URL and CLICKHOUSE_DATABASE_URL

set -e

# Debug: Print secret values (for troubleshooting only, remove after debugging!)
echo "PLAUSIBLE_POSTGRES_USER: $(cat /run/secrets/PLAUSIBLE_POSTGRES_USER)"
echo "PLAUSIBLE_POSTGRES_PASSWORD: $(cat /run/secrets/PLAUSIBLE_POSTGRES_PASSWORD)"
echo "PLAUSIBLE_CLICKHOUSE_USER: $(cat /run/secrets/PLAUSIBLE_CLICKHOUSE_USER)"
echo "PLAUSIBLE_CLICKHOUSE_PASSWORD: $(cat /run/secrets/PLAUSIBLE_CLICKHOUSE_PASSWORD)"
echo "PLAUSIBLE_SECRET_KEY: $(cat /run/secrets/PLAUSIBLE_SECRET_KEY)"

# Read secrets from Docker secrets
PLAUSIBLE_POSTGRES_USER="$(cat /run/secrets/PLAUSIBLE_POSTGRES_USER)"
export PLAUSIBLE_POSTGRES_USER
PLAUSIBLE_POSTGRES_PASSWORD="$(cat /run/secrets/PLAUSIBLE_POSTGRES_PASSWORD)"
export PLAUSIBLE_POSTGRES_PASSWORD
PLAUSIBLE_CLICKHOUSE_USER="$(cat /run/secrets/PLAUSIBLE_CLICKHOUSE_USER)"
export PLAUSIBLE_CLICKHOUSE_USER
PLAUSIBLE_CLICKHOUSE_PASSWORD="$(cat /run/secrets/PLAUSIBLE_CLICKHOUSE_PASSWORD)"
export PLAUSIBLE_CLICKHOUSE_PASSWORD

# Construct URLs
export DATABASE_URL="postgresql://$PLAUSIBLE_POSTGRES_USER:$PLAUSIBLE_POSTGRES_PASSWORD@plausible_db:5432/plausible_db"
export CLICKHOUSE_DATABASE_URL="clickhouse://$PLAUSIBLE_CLICKHOUSE_USER:$PLAUSIBLE_CLICKHOUSE_PASSWORD@plausible_events_db:9000/plausible_events_db"

# Start Plausible
exec docker-entrypoint.sh
