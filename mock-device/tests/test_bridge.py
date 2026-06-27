"""WebSocket bridge integration tests."""

from __future__ import annotations

import asyncio
import subprocess
import sys
import time
from pathlib import Path

import pytest

MOCK_ROOT = Path(__file__).resolve().parent.parent
STATES = MOCK_ROOT / "states"
BRIDGE_FILE = MOCK_ROOT / ".protov-mock.bridge"
BRIDGE_URL = "ws://127.0.0.1:9876"


async def _wait_for_bridge(url: str, timeout_s: float) -> None:
    websockets = pytest.importorskip("websockets")
    deadline = time.time() + timeout_s
    last_error: Exception | None = None
    while time.time() < deadline:
        try:
            async with websockets.connect(url):
                return
        except Exception as exc:  # noqa: BLE001 - retry until timeout
            last_error = exc
            await asyncio.sleep(0.05)
    raise RuntimeError(f"Timed out waiting for bridge at {url}") from last_error


@pytest.fixture
def bridge_server(tmp_path: Path):
    ctrl_sock = tmp_path / "ctrl"
    if BRIDGE_FILE.exists():
        BRIDGE_FILE.unlink()

    proc = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "protov_scpi",
            "--port",
            "none",
            "--web-bridge",
            "--web-bridge-port",
            "9876",
            "--control-socket",
            str(ctrl_sock),
        ],
        cwd=MOCK_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    try:
        asyncio.run(_wait_for_bridge(BRIDGE_URL, timeout_s=5))
    except RuntimeError:
        proc.kill()
        stdout, stderr = proc.communicate()
        raise RuntimeError(f"Bridge server failed to start.\nstdout: {stdout}\nstderr: {stderr}")

    yield BRIDGE_URL

    proc.terminate()
    try:
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        proc.kill()
    if BRIDGE_FILE.exists():
        BRIDGE_FILE.unlink()


def test_web_bridge_idn(bridge_server: str):
    websockets = pytest.importorskip("websockets")

    async def query_idn() -> str:
        async with websockets.connect(bridge_server) as ws:
            await ws.send("*IDN?\n")
            return (await ws.recv()).strip()

    idn = asyncio.run(query_idn())
    assert idn == "FBRD Inc.,ProtoV MINI,550e8400,1.0.0,A.1"


def test_web_bridge_multiple_devices(bridge_server: str):
    websockets = pytest.importorskip("websockets")

    async def query_idns() -> list[str]:
        async def one_idn() -> str:
            async with websockets.connect(bridge_server) as ws:
                await ws.send("*IDN?\n")
                return (await ws.recv()).strip()

        return await asyncio.gather(*(one_idn() for _ in range(4)))

    idns = asyncio.run(query_idns())
    serials = {entry.split(",")[2] for entry in idns}
    assert len(serials) == 4
    assert serials == {"550e8400", "32983fe4", "deadbeef", "a1b2c3d4"}
