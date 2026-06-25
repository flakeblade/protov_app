from __future__ import annotations

import json
import logging
import os
import select
import socket
import threading
from pathlib import Path
from typing import Callable

from .device import ScpiDevice
from .models import DeviceState
from .state_loader import dump_state, load_state_file

logger = logging.getLogger(__name__)


class ControlServer:
    """Unix domain socket for test orchestration (Playwright, CI)."""

    def __init__(
        self,
        socket_path: Path,
        get_device: Callable[[], ScpiDevice],
        reload_state: Callable[[DeviceState], None],
    ) -> None:
        self.socket_path = socket_path
        self.get_device = get_device
        self.reload_state = reload_state
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._server: socket.socket | None = None

    def start(self) -> None:
        if self.socket_path.exists():
            self.socket_path.unlink()
        self._server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self._server.bind(str(self.socket_path))
        self._server.listen(5)
        self._thread = threading.Thread(target=self._serve, daemon=True)
        self._thread.start()
        logger.info("Control socket listening on %s", self.socket_path)

    def stop(self) -> None:
        self._stop.set()
        if self._server is not None:
            try:
                self._server.close()
            except OSError:
                pass
        if self._thread is not None:
            self._thread.join(timeout=2)
        if self.socket_path.exists():
            self.socket_path.unlink()

    def _serve(self) -> None:
        assert self._server is not None
        while not self._stop.is_set():
            readable, _, _ = select.select([self._server], [], [], 0.5)
            if not readable:
                continue
            try:
                conn, _ = self._server.accept()
            except OSError:
                break
            with conn:
                try:
                    data = conn.recv(4096).decode("utf-8").strip()
                    response = self._handle_command(data)
                    conn.sendall((response + "\n").encode("utf-8"))
                except OSError as exc:
                    logger.debug("Control client error: %s", exc)

    def _handle_command(self, command: str) -> str:
        parts = command.split(maxsplit=1)
        if not parts:
            return "ERR empty command"

        action = parts[0].upper()
        arg = parts[1] if len(parts) > 1 else ""

        if action == "PING":
            return "OK pong"

        if action == "STATUS":
            return json.dumps(dump_state(self.get_device().state))

        if action == "RESET":
            device = self.get_device()
            device.state.default_reset()
            return "OK reset"

        if action == "LOAD":
            if not arg:
                return "ERR missing state file path"
            path = Path(arg)
            if not path.is_absolute():
                path = Path.cwd() / path
            state = load_state_file(path)
            self.reload_state(state)
            return f"OK loaded {path.name}"

        if action == "PORT":
            port_file = Path(arg) if arg else Path.cwd() / ".protov-mock.port"
            if port_file.exists():
                return port_file.read_text(encoding="utf-8").strip()
            return "ERR port file missing"

        return f"ERR unknown action: {action}"


def write_port_file(port_path: Path, client_port: str) -> None:
    port_path.write_text(client_port + "\n", encoding="utf-8")
    logger.info("Client serial port: %s (written to %s)", client_port, port_path)


def resolve_port_path(port: str, port_file: Path) -> tuple[int | str, str]:
    """
    Resolve serial port configuration.

    Returns (pyserial port argument, client-visible port path for WebSerial).
    """
    if port == "auto":
        import pty

        master, slave = pty.openpty()
        client_port = os.ttyname(slave)
        os.close(slave)
        write_port_file(port_file, client_port)
        return master, client_port

    port_path = Path(port)
    write_port_file(port_file, str(port_path))
    return str(port_path), str(port_path)
