#!/bin/sh
set -eu

GAME_APIKEY_FILE="${GAME_APIKEY_ENV_FILE:-/run/greencrowd/game-apikey.env}"

if [ ! -f "$GAME_APIKEY_FILE" ]; then
  echo "Missing GAME API key file: $GAME_APIKEY_FILE" >&2
  exit 1
fi

set -a
. "$GAME_APIKEY_FILE"
set +a

if [ -z "${API_GAME_APIKEY:-}" ] || [ "$API_GAME_APIKEY" = "your_game_api_key_here" ]; then
  echo "GAME API key is not provisioned in $GAME_APIKEY_FILE" >&2
  exit 1
fi

exec "$@"
