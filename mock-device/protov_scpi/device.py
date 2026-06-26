from __future__ import annotations

import re
import threading
from dataclasses import dataclass

from .colors import normalize_color_name
from .models import ChannelState, DeviceState
from .state_loader import normalize_command, parse_channel_token


@dataclass
class CommandResult:
    response: str | None = None
    error: tuple[int, str] | None = None


class ScpiDevice:
    """SCPI command handler for the ProtoV MINI mock power supply."""

    VOLT_FMT = "{:.3f}"
    CURR_FMT = "{:.3f}"
    POW_FMT = "{:.3f}"

    def __init__(self, state: DeviceState | None = None) -> None:
        self.state = state or DeviceState()
        self._lock = threading.Lock()

    def handle(self, raw_command: str) -> CommandResult:
        with self._lock:
            command = normalize_command(raw_command)
            if not command:
                return CommandResult()

            try:
                return self._dispatch(command)
            except ValueError as exc:
                self.state.push_error(-221, "Settings conflict")
                return CommandResult(error=(-221, str(exc)))

    def _dispatch(self, command: str) -> CommandResult:
        if command == "*IDN?":
            s = self.state
            return CommandResult(
                response=f"{s.manufacturer},{s.model},{s.serial},{s.fw_version},{s.hw_version}"
            )

        if command == "*RST":
            self.state.default_reset()
            return CommandResult()

        save_match = re.fullmatch(r"\*SAV (\d)", command)
        if save_match:
            slot = int(save_match.group(1))
            if slot < 1 or slot > 9:
                raise ValueError("Save slot out of range")
            self.state.save_slots[slot] = self.state.snapshot_channels()
            return CommandResult()

        recall_match = re.fullmatch(r"\*RCL (\d)", command)
        if recall_match:
            slot = int(recall_match.group(1))
            if slot < 1 or slot > 9:
                raise ValueError("Recall slot out of range")
            snapshot = self.state.save_slots.get(slot)
            if snapshot is None:
                self.state.push_error(-221, "Settings conflict")
                return CommandResult(error=(-221, "Empty save slot"))
            self.state.restore_channels(snapshot)
            return CommandResult()

        delete_match = re.fullmatch(r"\*DEL (\d)", command)
        if delete_match:
            slot = int(delete_match.group(1))
            if slot < 1 or slot > 9:
                raise ValueError("Delete slot out of range")
            self.state.save_slots.pop(slot, None)
            return CommandResult()

        meas_match = re.fullmatch(r"MEAS:(CURR|VOLT|POW)\? (CH[12])", command)
        if meas_match:
            meas_type, channel = meas_match.groups()
            ch_state = self._channel(channel)
            if meas_type == "CURR":
                return CommandResult(response=self.CURR_FMT.format(ch_state.measured_current(channel)))
            if meas_type == "VOLT":
                return CommandResult(response=self.VOLT_FMT.format(ch_state.measured_voltage(channel)))
            return CommandResult(response=self.POW_FMT.format(ch_state.measured_power(channel)))

        query_match = re.fullmatch(r"(CH[12]):(VOLT|CURR|OVP|OCP|COLR)\?", command)
        if query_match:
            channel, param = query_match.groups()
            ch_state = self._channel(channel)
            if param == "VOLT":
                return CommandResult(response=self.VOLT_FMT.format(ch_state.voltage_set))
            if param == "CURR":
                return CommandResult(response=self.CURR_FMT.format(ch_state.current_set))
            if param == "OVP":
                return CommandResult(response=self.VOLT_FMT.format(ch_state.ovp))
            if param == "OCP":
                return CommandResult(response=self.CURR_FMT.format(ch_state.ocp))
            return CommandResult(response=ch_state.color)

        color_match = re.fullmatch(r"(CH[12]):COLR ([A-Z]+)", command)
        if color_match:
            channel, color_name = color_match.groups()
            ch_state = self._channel(channel)
            ch_state.color = normalize_color_name(color_name)
            return CommandResult()

        set_match = re.fullmatch(r"(CH[12]):(VOLT|CURR|OVP|OCP) ([-+]?\d*\.?\d+)", command)
        if set_match:
            channel, param, value_str = set_match.groups()
            value = float(value_str)
            ch_state = self._channel(channel)
            if param == "VOLT":
                ch_state.voltage_set = value
            elif param == "CURR":
                ch_state.current_set = value
            elif param == "OVP":
                ch_state.ovp = value
            else:
                ch_state.ocp = value
            return CommandResult()

        outp_match = re.fullmatch(r"OUTP (CH[12]),(ON|OFF)", command)
        if outp_match:
            channel, mode = outp_match.groups()
            ch_state = self._channel(channel)
            ch_state.output_on = mode == "ON"
            return CommandResult()

        outp_query = re.fullmatch(r"OUTP\? (CH[12])", command)
        if outp_query:
            ch_state = self._channel(outp_query.group(1))
            return CommandResult(response="ON" if ch_state.output_on else "OFF")

        if command == "OUTP:RESET:PROT":
            for ch_state in self.state.channels.values():
                ch_state.prot_latched = False
            return CommandResult()

        reset_prot = re.fullmatch(r"OUTP:RESET:PROT (CH[12])", command)
        if reset_prot:
            self._channel(reset_prot.group(1)).prot_latched = False
            return CommandResult()

        if command == "SYST:ERR?":
            code, message = self.state.pop_error()
            return CommandResult(response=f'{code},"{message}"')

        if command == "SYST:VERS?":
            return CommandResult(response="1999.0")

        if command == "SYST:LOC":
            self.state.remote = False
            return CommandResult()

        if command == "SYST:REM":
            self.state.remote = True
            return CommandResult()

        self.state.push_error(-221, "Settings conflict")
        return CommandResult(error=(-221, f"Unknown command: {command}"))

    def _channel(self, channel: str) -> ChannelState:
        key = parse_channel_token(channel)
        if key not in self.state.channels:
            raise ValueError(f"Unknown channel: {channel}")
        return self.state.channels[key]
