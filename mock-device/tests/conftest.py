from __future__ import annotations

import subprocess
import sys
import threading
import time
from pathlib import Path

import pytest

MOCK_ROOT = Path(__file__).resolve().parent.parent
STATES = MOCK_ROOT / "states"


@pytest.fixture(scope="session")
def mock_root() -> Path:
    return MOCK_ROOT


@pytest.fixture
def mock_server(mock_root: Path, tmp_path: Path):
    """Start mock SCPI server on an auto-created PTY for the test duration."""
    port_file = tmp_path / "port"
    ctrl_sock = tmp_path / "ctrl"
    proc = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "protov_scpi",
            "--port",
            "auto",
            "--port-file",
            str(port_file),
            "--control-socket",
            str(ctrl_sock),
            "--state",
            str(STATES / "default.yaml"),
        ],
        cwd=mock_root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    deadline = time.time() + 5
    client_port = ""
    while time.time() < deadline:
        if port_file.exists():
            client_port = port_file.read_text(encoding="utf-8").strip()
            if client_port:
                break
        if proc.poll() is not None:
            stdout, stderr = proc.communicate()
            raise RuntimeError(
                f"Mock server exited early.\nstdout: {stdout}\nstderr: {stderr}"
            )
        time.sleep(0.05)

    if not client_port:
        proc.kill()
        raise RuntimeError("Timed out waiting for mock server port file")

    yield {
        "port": client_port,
        "port_file": port_file,
        "control_socket": ctrl_sock,
        "process": proc,
    }

    proc.terminate()
    try:
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        proc.kill()


@pytest.fixture
def visa_instrument(mock_server):
    """Open a pyvisa-py serial resource to the mock device."""
    pyvisa = pytest.importorskip("pyvisa")

    rm = pyvisa.ResourceManager("@py")
    resource = f"ASRL{mock_server['port']}::INSTR"
    inst = rm.open_resource(
        resource,
        read_termination="\n",
        write_termination="\n",
        timeout=2000,
    )
    yield inst
    inst.close()
    rm.close()
