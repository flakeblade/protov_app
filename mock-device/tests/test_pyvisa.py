from __future__ import annotations

import json
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest

STATES = Path(__file__).resolve().parent.parent / "states"


def _control(ctrl_sock: Path, command: str) -> str:
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
        sock.connect(str(ctrl_sock))
        sock.sendall((command + "\n").encode("utf-8"))
        return sock.recv(65536).decode("utf-8").strip()


def test_pyvisa_idn(visa_instrument):
    idn = visa_instrument.query("*IDN?")
    assert idn.startswith("Flake-Blade,ProtoV-MINI,")


def test_pyvisa_voltage_and_measure(visa_instrument):
    visa_instrument.write("CH1:VOLT 3.3")
    assert visa_instrument.query("CH1:VOLT?") == "3.300"

    visa_instrument.write("CH1:CURR 0.5")
    assert visa_instrument.query("CH1:CURR?") == "0.500"

    visa_instrument.write("OUTP CH1,ON")
    assert visa_instrument.query("OUTP? CH1") == "ON"

    voltage = float(visa_instrument.query("MEAS:VOLT? CH1"))
    assert 3.25 < voltage < 3.32


def test_pyvisa_system_commands(visa_instrument):
    assert visa_instrument.query("SYST:VERS?") == "1999.0"
    assert visa_instrument.query("SYST:ERR?") == '0,"No error"'


def test_pyvisa_save_recall(visa_instrument):
    visa_instrument.write("CH2:VOLT 5.0")
    visa_instrument.write("*SAV 1")
    visa_instrument.write("CH2:VOLT 1.0")
    assert visa_instrument.query("CH2:VOLT?") == "1.000"
    visa_instrument.write("*RCL 1")
    assert visa_instrument.query("CH2:VOLT?") == "5.000"


def test_control_socket_load_state(mock_server):
    ctrl = mock_server["control_socket"]
    pyvisa = pytest.importorskip("pyvisa")

    response = _control(ctrl, f"LOAD {STATES / 'ch1-active.yaml'}")
    assert response.startswith("OK loaded")

    rm = pyvisa.ResourceManager("@py")
    inst = rm.open_resource(
        f"ASRL{mock_server['port']}::INSTR",
        read_termination="\n",
        write_termination="\n",
        timeout=2000,
    )
    try:
        current = float(inst.query("MEAS:CURR? CH1"))
        assert 0.22 < current < 0.27
        assert inst.query("OUTP? CH1") == "ON"
    finally:
        inst.close()
        rm.close()


def test_control_status_json(mock_server):
    status_raw = _control(mock_server["control_socket"], "STATUS")
    status = json.loads(status_raw)
    assert "CH1" in status["channels"]
    assert status["remote"] is True


def test_cli_control_script(mock_server, mock_root):
    script = mock_root / "scripts" / "control.py"
    result = subprocess.run(
        [sys.executable, str(script), "PING", "--socket", str(mock_server["control_socket"])],
        check=True,
        capture_output=True,
        text=True,
    )
    assert result.stdout.strip() == "OK pong"
