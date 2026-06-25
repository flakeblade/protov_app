from __future__ import annotations

import argparse
import logging
from pathlib import Path

from .server import run_server


def main() -> None:
    parser = argparse.ArgumentParser(
        description="ProtoV MINI mock power supply (SCPI over serial)"
    )
    parser.add_argument(
        "--port",
        default="auto",
        help=(
            "Serial port path, or 'auto' to create a PTY pair. "
            "Use the peer path from scripts/create_port.sh for a stable symlink."
        ),
    )
    parser.add_argument("--baudrate", type=int, default=115200)
    parser.add_argument(
        "--state",
        type=Path,
        help="Initial state preset (JSON or YAML) from mock-device/states/",
    )
    parser.add_argument(
        "--port-file",
        type=Path,
        default=Path(".protov-mock.port"),
        help="Where to write the client-visible serial port path",
    )
    parser.add_argument(
        "--control-socket",
        type=Path,
        default=Path(".protov-mock.ctrl"),
        help="Unix socket for Playwright/CI control commands",
    )
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    run_server(
        port=args.port,
        baudrate=args.baudrate,
        state_file=args.state,
        port_file=args.port_file,
        control_socket=args.control_socket,
    )


if __name__ == "__main__":
    main()
