from __future__ import annotations

from protov_scpi.device import ScpiDevice
from protov_scpi.state_loader import load_state_file


def test_idn():
    device = ScpiDevice()
    result = device.handle("*IDN?")
    assert result.response == "FBRD Inc.,ProtoV MINI,550e8400,1.0.0,A.1"


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
    assert device.handle("CH1:COLR?").response == "234,67,53"
    assert device.handle("CH2:COLR?").response == "66,133,244"
    device.handle("CH1:COLR 255,255,0")
    device.handle("CH2:COLR 0,255,255")
    assert device.handle("CH1:COLR?").response == "255,255,0"
    assert device.handle("CH2:COLR?").response == "0,255,255"


def test_channel_color_invalid():
    device = ScpiDevice()
    result = device.handle("CH1:COLR 256,0,0")
    assert result.error is not None
    assert device.handle("SYST:ERR?").response.startswith("-221")


def test_brightness_set_and_query():
    device = ScpiDevice()
    assert device.handle("LCD:BRIG?").response == "128"
    assert device.handle("LED:BRIG?").response == "255"
    device.handle("LCD:BRIG 200")
    device.handle("LED:BRIG 64")
    assert device.handle("LCD:BRIG?").response == "200"
    assert device.handle("LED:BRIG?").response == "64"


def test_brightness_invalid():
    device = ScpiDevice()
    result = device.handle("LCD:BRIG 300")
    assert result.error is not None


def test_telemetry_snapshot():
    device = ScpiDevice()
    result = device.handle("TELEM?")
    assert result.response is not None
    parts = result.response.split(",")
    assert len(parts) == 8
    ch_a, ch_b, mcu, inp_type, inp_v, inp_i, sense, converter = parts
    assert float(ch_a) > 20
    assert float(ch_b) > 20
    assert float(mcu) > 25
    assert inp_type in ("PD", "STD")
    assert float(inp_v) > 0
    assert float(inp_i) > 0
    assert sense in ("0", "1")
    assert converter in ("0", "1")


def test_temperature_queries():
    device = ScpiDevice()
    ch_a = float(device.handle("TEMP? CHA").response)
    ch_b = float(device.handle("TEMP? CHB").response)
    mcu = float(device.handle("TEMP? MCU").response)
    assert ch_a > 20
    assert ch_b > 20
    assert mcu > 25


def test_input_and_diag_queries():
    device = ScpiDevice()
    inp = device.handle("INP?").response
    assert inp is not None
    assert inp.startswith("PD,") or inp.startswith("STD,")
    diag = device.handle("DIAG?").response
    assert diag == "1,1"


def test_register_dumps():
    device = ScpiDevice()
    ina = device.handle("INA226:REG? CHA").response
    assert ina is not None
    assert "INA226" in ina
    assert "|" in ina
    informal = device.handle("ina226 dump chb").response
    assert informal is not None
    assert "0x40" in informal
    tps = device.handle("TPS55289:REG? CHB").response
    assert tps is not None
    assert "TPS55289" in tps
