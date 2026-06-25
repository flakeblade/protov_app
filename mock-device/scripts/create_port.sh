#!/usr/bin/env bash
# Create a stable virtual serial port pair for WebSerial / pyvisa.
#
#   /tmp/protov-mini       ← browser WebSerial / lab app (client)
#   /tmp/protov-mini-peer  ← mock SCPI server (--port)
#
# Requires: socat
set -euo pipefail

CLIENT_LINK="${PROTOV_MOCK_CLIENT_PORT:-/tmp/protov-mini}"
SERVER_LINK="${PROTOV_MOCK_SERVER_PORT:-/tmp/protov-mini-peer}"

if ! command -v socat >/dev/null 2>&1; then
  echo "socat is required. Install with: sudo apt install socat" >&2
  exit 1
fi

rm -f "$CLIENT_LINK" "$SERVER_LINK"

echo "Creating PTY pair:"
echo "  client (WebSerial/pyvisa): $CLIENT_LINK"
echo "  server (mock device):      $SERVER_LINK"

exec socat -d -d \
  "PTY,link=${CLIENT_LINK},raw,echo=0,mode=666" \
  "PTY,link=${SERVER_LINK},raw,echo=0,mode=666"
