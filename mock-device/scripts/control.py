#!/usr/bin/env python3
"""Send a command to the mock device control socket."""

from __future__ import annotations

import argparse
import socket
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="ProtoV mock device control client")
    parser.add_argument(
        "command",
        nargs="?",
        default="PING",
        help="Control command (PING, STATUS, RESET, LOAD <path>, PORT [file])",
    )
    parser.add_argument(
        "--socket",
        type=Path,
        default=Path(__file__).resolve().parent.parent / ".protov-mock.ctrl",
    )
    args = parser.parse_args()

    if not args.socket.exists():
        print(f"Control socket not found: {args.socket}", file=sys.stderr)
        return 1

    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
        sock.connect(str(args.socket))
        sock.sendall((args.command + "\n").encode("utf-8"))
        data = sock.recv(65536).decode("utf-8").strip()
        print(data)
        return 0 if not data.startswith("ERR") else 1


if __name__ == "__main__":
    raise SystemExit(main())
