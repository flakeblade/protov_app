from __future__ import annotations

from protov_scpi.device import ScpiDevice
from protov_scpi.state_loader import load_state_file


def test_idn():
    device = ScpiDevice()
    result = device.handle("*IDN?")
    assert result.response == "Flake-Blade,ProtoV-MINI,550e8400,1.0.0,A.1"


def test_voltage_set_and_query():
    device = ScpiDevice()
    device.handle("CH1:VOLT 3.3")
    result = device.handle("CH1:VOLT?")
    assert result.response == "3.300"


def test_measurements_from_preset(mock_root):
    state = load_state_file(mock_root / "states" / "ch1-active.yaml")
    device = ScpiDevice(state)
    voltage = float(device.handle("MEAS:VOLT? CH1").response)
    current = float(device.handle("MEAS:CURR? CH1").response)
    assert 3.25 < voltage < 3.32
    assert 0.22 < current < 0.27
    voltage_again = float(device.handle("MEAS:VOLT? CH1").response)
    assert abs(voltage_again - voltage) < 0.05


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


def test_channel_color_set_and_query():
    device = ScpiDevice()
    assert device.handle("CH1:COLR?").response == "RED"
    assert device.handle("CH2:COLR?").response == "BLUE"
    device.handle("CH1:COLR YELLOW")
    device.handle("CH2:COLR TEAL")
    assert device.handle("CH1:COLR?").response == "YELLOW"
    assert device.handle("CH2:COLR?").response == "TEAL"


def test_channel_color_invalid():
    device = ScpiDevice()
    result = device.handle("CH1:COLR MAGENTA")
    assert result.error is not None
    assert device.handle("SYST:ERR?").response.startswith("-221")
