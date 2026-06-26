#!/usr/bin/env bash
# Run the mock ProtoV MINI — SCPI server with optional WebSocket bridge for browser dev.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VENV="${ROOT}/.venv"
if [[ ! -d "$VENV" ]]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q -r requirements.txt
fi

PORT="${PROTOV_MOCK_SERVER_PORT:-none}"
STATE="${PROTOV_MOCK_STATE:-}"
PORT_FILE="${PROTOV_MOCK_PORT_FILE:-${ROOT}/.protov-mock.port}"
CTRL_SOCK="${PROTOV_MOCK_CTRL_SOCK:-${ROOT}/.protov-mock.ctrl}"
WEB_BRIDGE="${PROTOV_MOCK_WEB_BRIDGE:-1}"

ARGS=(--port "$PORT" --port-file "$PORT_FILE" --control-socket "$CTRL_SOCK")
if [[ -n "$STATE" ]]; then
  ARGS+=(--state "$STATE")
fi
if [[ "$WEB_BRIDGE" == "1" ]]; then
  ARGS+=(--web-bridge)
fi

exec "$VENV/bin/python" -m protov_scpi "${ARGS[@]}" "$@"
