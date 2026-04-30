#!/bin/sh
set -e
# Ensure the wiki directory exists and is writable by the app user (uid 1001)
WIKI="${WIKI_DIR:-/wiki}"
mkdir -p "$WIKI"
chown -R 1001:1001 "$WIKI"
exec su-exec 1001:1001 "$@"
