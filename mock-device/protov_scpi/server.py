from __future__ import annotations

import logging
import os
import select
import threading
import time
from pathlib import Path

import serial

from .control import ControlServer, resolve_port_path
from .device import ScpiDevice
from .models import DeviceState
from .state_loader import load_state_file

logger = logging.getLogger(__name__)


class SerialScpiServer:
    """SCPI server loop over a pyserial port or PTY master fd."""

    def __init__(
        self,
        port: int | str,
        device: ScpiDevice,
        *,
        baudrate: int = 115200,
        control_socket: Path | None = None,
    ) -> None:
        self.port = port
        self.device = device
        self.baudrate = baudrate
        self.control_socket = control_socket
        self._stop = threading.Event()
        self._serial: serial.Serial | None = None
        self._control: ControlServer | None = None
        self._use_fd = isinstance(port, int)

    def reload_state(self, state: DeviceState) -> None:
        self.device.state = state

    def start(self) -> None:
        if self.control_socket is not None:
            self._control = ControlServer(
                self.control_socket,
                get_device=lambda: self.device,
                reload_state=self.reload_state,
            )
            self._control.start()

        if self._use_fd:
            self._run_fd_loop()
        else:
            self._run_serial_loop()

    def stop(self) -> None:
        self._stop.set()
        if self._serial is not None and self._serial.is_open:
            self._serial.close()
        if self._control is not None:
            self._control.stop()

    def _open_serial(self) -> serial.Serial:
        return serial.Serial(
            port=self.port,
            baudrate=self.baudrate,
            timeout=0.1,
            write_timeout=1.0,
        )

    def _run_serial_loop(self) -> None:
        self._serial = self._open_serial()
        logger.info("SCPI server listening on %s @ %d baud", self.port, self.baudrate)
        buffer = ""
        while not self._stop.is_set():
            chunk = self._serial.read(256)
            if chunk:
                buffer += chunk.decode("utf-8", errors="replace")
                buffer = self._process_buffer(buffer, self._serial.write)
            else:
                time.sleep(0.01)

    def _run_fd_loop(self) -> None:
        master_fd = self.port
        logger.info("SCPI server listening on PTY fd %s", master_fd)
        buffer = b""
        while not self._stop.is_set():
            readable, _, _ = select.select([master_fd], [], [], 0.1)
            if not readable:
                continue
            try:
                chunk = os.read(master_fd, 256)
            except OSError as exc:
                # Master read returns EIO until a client opens the slave side.
                if exc.errno in (5, 6):  # EIO, ENXIO
                    continue
                logger.exception("PTY read failed")
                break
            if not chunk:
                continue
            buffer += chunk
            text, buffer = self._split_buffer_bytes(buffer)
            for line in text.splitlines(keepends=True):
                response = self._handle_line(line)
                if response is not None:
                    try:
                        os.write(master_fd, response.encode("utf-8"))
                    except OSError as exc:
                        if exc.errno not in (5, 6):
                            logger.exception("PTY write failed")
                            return

    def _process_buffer(self, buffer: str, write_fn) -> str:
        while True:
            for terminator in ("\n", "\r"):
                if terminator in buffer:
                    line, _, remainder = buffer.partition(terminator)
                    response = self._handle_line(line)
                    if response is not None:
                        write_fn(response.encode("utf-8"))
                    buffer = remainder
                    break
            else:
                break
        return buffer

    @staticmethod
    def _split_buffer_bytes(buffer: bytes) -> tuple[str, bytes]:
        text = buffer.decode("utf-8", errors="replace")
        if "\n" in text or "\r" in text:
            lines = []
            remainder = buffer
            while True:
                decoded = remainder.decode("utf-8", errors="replace")
                for terminator in ("\n", "\r"):
                    if terminator in decoded:
                        line, _, rest = decoded.partition(terminator)
                        lines.append(line + terminator)
                        remainder = rest.encode("utf-8")
                        break
                else:
                    break
            return "".join(lines), remainder
        return "", buffer

    def _handle_line(self, raw_line: str) -> str | None:
        line = raw_line.strip()
        if not line:
            return None
        result = self.device.handle(line)
        if result.response is None:
            return None
        return result.response + "\n"


def run_server(
    *,
    port: str = "auto",
    baudrate: int = 115200,
    state_file: Path | None = None,
    port_file: Path | None = None,
    control_socket: Path | None = None,
) -> None:
    port_file = port_file or Path.cwd() / ".protov-mock.port"
    control_socket = control_socket or Path.cwd() / ".protov-mock.ctrl"

    initial_state = load_state_file(state_file) if state_file else DeviceState()
    device = ScpiDevice(initial_state)
    resolved_port, client_port = resolve_port_path(port, port_file)

    server = SerialScpiServer(
        resolved_port,
        device,
        baudrate=baudrate,
        control_socket=control_socket,
    )

    logger.info("Connect pyvisa/WebSerial to: %s", client_port)
    logger.info("Control socket: %s", control_socket)

    try:
        server.start()
    except KeyboardInterrupt:
        logger.info("Shutting down")
    finally:
        server.stop()
