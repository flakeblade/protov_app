from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

ChannelId = Literal["CH1", "CH2"]


@dataclass
class MeasuredValues:
    voltage: float | None = None
    current: float | None = None
    power: float | None = None


@dataclass
class ChannelState:
    voltage_set: float = 0.0
    current_set: float = 0.5
    ovp: float = 18.0
    ocp: float = 1.0
    output_on: bool = False
    prot_latched: bool = False
    measured: MeasuredValues = field(default_factory=MeasuredValues)

    def measured_voltage(self) -> float:
        if self.measured.voltage is not None:
            return self.measured.voltage
        return self.voltage_set if self.output_on else 0.0

    def measured_current(self) -> float:
        if self.measured.current is not None:
            return self.measured.current
        return self.current_set if self.output_on else 0.0

    def measured_power(self) -> float:
        if self.measured.power is not None:
            return self.measured.power
        return self.measured_voltage() * self.measured_current()


@dataclass
class DeviceState:
    manufacturer: str = "Flake-Blade"
    model: str = "ProtoV-MINI"
    serial: str = "550e8400"
    fw_version: str = "1.0.0"
    remote: bool = True
    channels: dict[str, ChannelState] = field(
        default_factory=lambda: {
            "CH1": ChannelState(
                voltage_set=3.3,
                current_set=0.5,
                ovp=18.0,
                ocp=1.0,
                output_on=False,
            ),
            "CH2": ChannelState(
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
        self.channels = {
            "CH1": ChannelState(
                voltage_set=3.3,
                current_set=0.5,
                ovp=18.0,
                ocp=1.0,
                output_on=False,
            ),
            "CH2": ChannelState(
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
