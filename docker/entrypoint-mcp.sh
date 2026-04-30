#!/bin/sh
set -e
# Ensure the wiki directory exists and is writable by the app user (uid 1001)
# This runs as root before dropping privileges, so it works regardless of
# whether the Docker volume was previously owned by root.
WIKI="${WIKI_DIR:-/wiki}"
mkdir -p "$WIKI"
chown -R 1001:1001 "$WIKI"
exec su-exec 1001:1001 "$@"
