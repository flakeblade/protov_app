from __future__ import annotations

import threading

from .device import ScpiDevice
from .models import ChannelState, DeviceState
from .colors import DEFAULT_CHANNEL_COLORS

MAX_MOCK_DEVICES = 4

MOCK_DEVICE_PROFILES: tuple[dict[str, str], ...] = (
    {"serial": "550e8400", "fw_version": "1.0.0", "hw_version": "A.1"},
    {"serial": "32983fe4", "fw_version": "1.0.1", "hw_version": "B.2"},
    {"serial": "deadbeef", "fw_version": "0.9.0", "hw_version": "A.0"},
    {"serial": "a1b2c3d4", "fw_version": "1.2.3", "hw_version": "C.1"},
)


def _default_channels() -> dict[str, ChannelState]:
    return {
        "CH1": ChannelState(
            voltage_set=3.3,
            current_set=0.5,
            ovp=18.0,
            ocp=1.0,
            output_on=False,
            color=DEFAULT_CHANNEL_COLORS["CH1"],
        ),
        "CH2": ChannelState(
            voltage_set=5.0,
            current_set=2.0,
            ovp=6.0,
            ocp=3.0,
            output_on=False,
            color=DEFAULT_CHANNEL_COLORS["CH2"],
        ),
    }


def create_device_state(profile: dict[str, str]) -> DeviceState:
    return DeviceState(
        serial=profile["serial"],
        fw_version=profile["fw_version"],
        hw_version=profile["hw_version"],
        channels=_default_channels(),
    )


class DevicePool:
    """Up to four independent mock devices for multi-connection WebSocket dev."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._devices = [ScpiDevice(create_device_state(profile)) for profile in MOCK_DEVICE_PROFILES]
        self._in_use = [False] * MAX_MOCK_DEVICES

    def acquire(self) -> tuple[int, ScpiDevice] | None:
        with self._lock:
            for index, used in enumerate(self._in_use):
                if not used:
                    self._in_use[index] = True
                    return index, self._devices[index]
            return None

    def release(self, index: int) -> None:
        with self._lock:
            if index < 0 or index >= MAX_MOCK_DEVICES:
                return
            self._in_use[index] = False
            profile = MOCK_DEVICE_PROFILES[index]
            self._devices[index] = ScpiDevice(create_device_state(profile))

    @property
    def devices(self) -> list[ScpiDevice]:
        return self._devices
