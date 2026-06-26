"""Telemetry simulation and register dump formatting for the mock SCPI device."""

from __future__ import annotations

import math
import time
from typing import Literal

from .models import DeviceState

InputType = Literal["PD", "STD"]
RegisterChannel = Literal["A", "B"]


def _phase(serial: str) -> float:
    return sum(ord(char) for char in serial) * 0.13


def simulated_temperatures(state: DeviceState) -> tuple[float, float, float]:
    """Channel A/B NTC and RP2040 MCU temperatures in °C."""
    t = time.time()
    phase = _phase(state.serial)

    ch1_on = state.channels["CH1"].output_on
    ch2_on = state.channels["CH2"].output_on
    load = (1.0 if ch1_on else 0.0) + (1.0 if ch2_on else 0.0)

    base_a = 28.0 + load * 4.5
    base_b = 27.5 + load * 4.0
    base_mcu = 34.0 + load * 6.0

    ch_a = base_a + math.sin(t * 0.4 + phase) * 1.2 + math.sin(t * 1.7 + phase) * 0.3
    ch_b = base_b + math.sin(t * 0.45 + phase + 0.8) * 1.1 + math.sin(t * 1.5 + phase) * 0.25
    mcu = base_mcu + math.sin(t * 0.35 + phase + 1.4) * 1.5 + math.sin(t * 2.1 + phase) * 0.4

    return round(ch_a, 3), round(ch_b, 3), round(mcu, 3)


def simulated_input_power(state: DeviceState) -> tuple[InputType, float, float]:
    """Input rail type, voltage (V), and current (A)."""
    t = time.time()
    phase = _phase(state.serial)

    ch1 = state.channels["CH1"]
    ch2 = state.channels["CH2"]
    output_load = 0.0
    if ch1.output_on:
        output_load += ch1.measured_current("CH1") * ch1.measured_voltage("CH1")
    if ch2.output_on:
        output_load += ch2.measured_current("CH2") * ch2.measured_voltage("CH2")

    inp_type: InputType = "PD"
    base_v = 20.0
    base_i = 0.35 + output_load / base_v
    ripple_v = math.sin(t * 0.9 + phase) * 0.08
    ripple_i = math.sin(t * 1.1 + phase + 0.5) * 0.04

    voltage = max(4.5, base_v + ripple_v)
    current = max(0.05, min(5.0, base_i + ripple_i))
    return inp_type, round(voltage, 3), round(current, 3)


def simulated_health(state: DeviceState) -> tuple[bool, bool]:
    """INA226 sense and TPS55289 converter health flags."""
    ch1 = state.channels["CH1"]
    ch2 = state.channels["CH2"]
    sense_ok = not ch1.prot_latched and not ch2.prot_latched
    converter_ok = sense_ok
    return sense_ok, converter_ok


def format_telemetry_snapshot(state: DeviceState) -> str:
    ch_a, ch_b, mcu = simulated_temperatures(state)
    inp_type, inp_v, inp_i = simulated_input_power(state)
    sense_ok, converter_ok = simulated_health(state)
    return (
        f"{ch_a:.3f},{ch_b:.3f},{mcu:.3f},"
        f"{inp_type},{inp_v:.3f},{inp_i:.3f},"
        f"{1 if sense_ok else 0},{1 if converter_ok else 0}"
    )


def format_ina226_dump(channel: RegisterChannel) -> str:
    addr = "41" if channel == "A" else "40"
    lines = [
        f"INA226 @ 0x{addr} (I2C1)",
        "00 CONFIG        4127",
        "01 SHUNT_V       0008",
        "02 BUS_V         28A0",
        "03 POWER         0064",
        "04 CURRENT       00A3",
        "05 CALIBRATION    1000",
        "06 ENABLE         0007",
        "07 ALERT_LIMIT    0000",
        "FE MANUF_ID       5449",
        "FF DIE_ID         2260",
    ]
    return "|".join(lines)


def format_tps55289_dump(channel: RegisterChannel) -> str:
    addr = "75" if channel == "A" else "74"
    lines = [
        f"TPS55289 @ 0x{addr} (I2C0)",
        "00 REF_LSB         C8",
        "01 REF_MSB         00",
        "02 IOUT_LIMIT      64",
        "03 VOUT_SR          0",
        "04 VOUT_FS          0",
        "05 CDC              0",
        "06 MODE            03",
        "07 STATUS          20",
    ]
    return "|".join(lines)
