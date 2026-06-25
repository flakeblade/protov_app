from __future__ import annotations

from protov_scpi.device import ScpiDevice
from protov_scpi.state_loader import load_state_file


def test_idn():
    device = ScpiDevice()
    result = device.handle("*IDN?")
    assert result.response == "Flake-Blade,ProtoV-MINI,550e8400,1.0.0"


def test_voltage_set_and_query():
    device = ScpiDevice()
    device.handle("CH1:VOLT 3.3")
    result = device.handle("CH1:VOLT?")
    assert result.response == "3.300"


def test_measurements_from_preset(mock_root):
    state = load_state_file(mock_root / "states" / "ch1-active.yaml")
    device = ScpiDevice(state)
    assert device.handle("MEAS:VOLT? CH1").response == "3.298"
    assert device.handle("MEAS:CURR? CH1").response == "0.243"
    assert device.handle("MEAS:POW? CH1").response == "0.801"


def test_output_on_off():
    device = ScpiDevice()
    device.handle("OUTP CH1,ON")
    assert device.handle("OUTP? CH1").response == "ON"
    device.handle("OUTP CH1,OFF")
    assert device.handle("OUTP? CH1").response == "OFF"


def test_syst_err_queue():
    device = ScpiDevice()
    device.state.push_error(-221, "Settings conflict")
    assert device.handle("SYST:ERR?").response == '-221,"Settings conflict"'
    assert device.handle("SYST:ERR?").response == '0,"No error"'
