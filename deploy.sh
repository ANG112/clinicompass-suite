#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/apps/clinicompass-suite/repo"
ENV_FILE="/opt/apps/clinicompass-suite/shared/.env"

cd "$APP_DIR"

git fetch --all --tags
git pull --ff-only

cp "$ENV_FILE" .env

docker compose build --pull
docker compose up -d

docker compose ps
