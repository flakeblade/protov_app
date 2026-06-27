from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from .colors import DEFAULT_CHANNEL_RGB, DEFAULT_LCD_BRIGHTNESS, DEFAULT_LED_BRIGHTNESS

ChannelId = Literal["CH1", "CH2"]


@dataclass
class MeasuredValues:
    voltage: float | None = None
    current: float | None = None
    power: float | None = None


def _default_channel(channel_id: str, **overrides) -> "ChannelState":
    r, g, b = DEFAULT_CHANNEL_RGB[channel_id]
    return ChannelState(color_r=r, color_g=g, color_b=b, **overrides)


@dataclass
class ChannelState:
    voltage_set: float = 0.0
    current_set: float = 0.5
    ovp: float = 18.0
    ocp: float = 1.0
    output_on: bool = False
    prot_latched: bool = False
    color_r: int = 234
    color_g: int = 67
    color_b: int = 53
    load_ratio: float = 0.85
    voltage_droop: float | None = None
    measured: MeasuredValues = field(default_factory=MeasuredValues)

    def measured_voltage(self, channel_id: str = "CH1") -> float:
        if not self.output_on:
            return 0.0
        from .simulation import simulated_voltage

        return simulated_voltage(channel_id, self)

    def measured_current(self, channel_id: str = "CH1") -> float:
        if not self.output_on:
            return 0.0
        from .simulation import simulated_current

        return simulated_current(channel_id, self)

    def measured_power(self, channel_id: str = "CH1") -> float:
        if not self.output_on:
            return 0.0
        from .simulation import simulated_power

        return simulated_power(channel_id, self)


@dataclass
class DeviceState:
    manufacturer: str = "FBRD Inc."
    model: str = "ProtoV MINI"
    serial: str = "550e8400"
    fw_version: str = "1.0.0"
    hw_version: str = "A.1"
    remote: bool = True
    lcd_brightness: int = DEFAULT_LCD_BRIGHTNESS
    led_brightness: int = DEFAULT_LED_BRIGHTNESS
    channels: dict[str, ChannelState] = field(
        default_factory=lambda: {
            "CH1": _default_channel(
                "CH1",
                voltage_set=3.3,
                current_set=0.5,
                ovp=18.0,
                ocp=1.0,
                output_on=False,
            ),
            "CH2": _default_channel(
                "CH2",
                voltage_set=5.0,
                current_set=2.0,
                ovp=6.0,
                ocp=3.0,
                output_on=False,
            ),
        }
    )
    save_slots: dict[int, dict[str, ChannelState]] = field(default_factory=dict)
    error_queue: list[tuple[int, str]] = field(default_factory=list)

    def default_reset(self) -> None:
        self.remote = True
        self.lcd_brightness = DEFAULT_LCD_BRIGHTNESS
        self.led_brightness = DEFAULT_LED_BRIGHTNESS
        self.channels = {
            "CH1": _default_channel(
                "CH1",
                voltage_set=3.3,
                current_set=0.5,
                ovp=18.0,
                ocp=1.0,
                output_on=False,
            ),
            "CH2": _default_channel(
                "CH2",
                voltage_set=5.0,
                current_set=2.0,
                ovp=6.0,
                ocp=3.0,
                output_on=False,
            ),
        }
        self.error_queue.clear()

    def push_error(self, code: int, message: str) -> None:
        self.error_queue.append((code, message))

    def pop_error(self) -> tuple[int, str]:
        if self.error_queue:
            return self.error_queue.pop(0)
        return 0, "No error"

    def snapshot_channels(self) -> dict[str, ChannelState]:
        return {
            ch: ChannelState(
                voltage_set=state.voltage_set,
                current_set=state.current_set,
                ovp=state.ovp,
                ocp=state.ocp,
                output_on=state.output_on,
                prot_latched=state.prot_latched,
                color_r=state.color_r,
                color_g=state.color_g,
                color_b=state.color_b,
                load_ratio=state.load_ratio,
                voltage_droop=state.voltage_droop,
                measured=MeasuredValues(
                    voltage=state.measured.voltage,
                    current=state.measured.current,
                    power=state.measured.power,
                ),
            )
            for ch, state in self.channels.items()
        }

    def restore_channels(self, snapshot: dict[str, ChannelState]) -> None:
        self.channels = snapshot
