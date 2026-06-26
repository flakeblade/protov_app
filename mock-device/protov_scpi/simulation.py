"""Live measurement simulation for mock SCPI readings."""

from __future__ import annotations

import math
import time

from .models import ChannelState


def _phase(channel_id: str) -> float:
    return sum(ord(char) for char in channel_id) * 0.17


def simulated_voltage(channel_id: str, channel: ChannelState) -> float:
    if not channel.output_on:
        return 0.0

    t = time.time()
    phase = _phase(channel_id)
    ripple = math.sin(t * 3.2 + phase) * 0.003
    drift = math.sin(t * 0.65 + phase) * 0.008
    droop = channel.voltage_droop if channel.voltage_droop is not None else 0.002
    return max(0.0, channel.voltage_set * (1 + ripple + drift) - droop)


def simulated_current(channel_id: str, channel: ChannelState) -> float:
    if not channel.output_on:
        return 0.0

    t = time.time()
    phase = _phase(channel_id)
    ripple = math.sin(t * 2.8 + phase + 1.2) * 0.012
    drift = math.sin(t * 0.55 + phase) * 0.025
    load = channel.load_ratio * channel.current_set
    return max(0.0, load * (1 + ripple + drift))


def simulated_power(channel_id: str, channel: ChannelState) -> float:
    return simulated_voltage(channel_id, channel) * simulated_current(channel_id, channel)
