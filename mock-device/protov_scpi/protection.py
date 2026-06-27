"""Channel hardware mode derivation — mirrors protovolt firmware protection logic."""

from __future__ import annotations

from dataclasses import dataclass

from .models import ChannelState, DeviceState
from .telemetry import simulated_temperatures

MCU_OTP_C = 50.0
CH_OTP_C = 55.0

MODE_OFF = "OFF"
MODE_CV = "CV"
MODE_CC = "CC"
MODE_SHORT = "SHORT"
MODE_TEMP = "TEMP"
MODE_OCP = "OCP"
MODE_OVP = "OVP"

FAULT_MODES = frozenset({MODE_OCP, MODE_OVP, MODE_TEMP, MODE_SHORT})


@dataclass(frozen=True)
class ConverterFlags:
    ocp: bool = False
    ovp: bool = False
    scp: bool = False


def is_fault_mode(mode: str) -> bool:
    return mode in FAULT_MODES


def simulated_converter_flags(
    channel: ChannelState,
    voltage: float,
    current: float,
) -> ConverterFlags | None:
    if not channel.output_on:
        return None
    ocp = channel.current_set > 0 and current >= channel.current_set * 0.98
    return ConverterFlags(ocp=ocp, ovp=False, scp=False)


def derive_hw_mode(channel_id: str, channel: ChannelState, device: DeviceState) -> str:
    if channel.prot_latched and channel.latched_mode and is_fault_mode(channel.latched_mode):
        return channel.latched_mode

    ch_a, ch_b, mcu = simulated_temperatures(device)
    ch_temp = ch_a if channel_id == "CH1" else ch_b

    if mcu >= MCU_OTP_C or ch_temp >= CH_OTP_C:
        return MODE_TEMP

    voltage = channel.measured_voltage(channel_id)
    current = channel.measured_current(channel_id)

    if channel.output_on:
        if current > channel.ocp:
            return MODE_OCP
        if voltage > channel.ovp:
            return MODE_OVP

    flags = simulated_converter_flags(channel, voltage, current)
    if flags is not None:
        if flags.ovp:
            return MODE_OVP
        if flags.scp:
            return MODE_SHORT

    if not channel.output_on:
        return MODE_OFF

    if flags is not None:
        if flags.ocp:
            return MODE_CC
        return MODE_CV

    return MODE_CV


def query_channel_mode(channel_id: str, channel: ChannelState, device: DeviceState) -> str:
    mode = derive_hw_mode(channel_id, channel, device)

    if is_fault_mode(mode) and not channel.prot_latched:
        channel.prot_latched = True
        channel.latched_mode = mode
        channel.output_on = False
        device.push_error(-221, "Settings conflict")

    return mode
