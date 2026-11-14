#!/bin/sh
# Container entrypoint: refresh ClamAV signatures in the background, apply
# pending migrations, then start the API.
set -eu

if [ "${CLAMAV_ENABLED:-}" = "true" ]; then
  # Image build already ran freshclam once; keep signatures current while the
  # container runs (default: every 6 hours).
  (
    while true; do
      freshclam --quiet || echo "[freshclam] signature update failed; will retry"
      sleep "${CLAMAV_UPDATE_INTERVAL_SECONDS:-21600}"
    done
  ) &
fi

./node_modules/.bin/prisma migrate deploy

exec node dist/index.js
