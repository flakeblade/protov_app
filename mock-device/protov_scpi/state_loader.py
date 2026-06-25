from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import yaml

from .models import ChannelState, DeviceState, MeasuredValues


def _parse_channel(data: dict[str, Any]) -> ChannelState:
    measured_raw = data.get("measured", {})
    return ChannelState(
        voltage_set=float(data.get("voltage", data.get("voltage_set", 0.0))),
        current_set=float(data.get("current", data.get("current_set", 0.5))),
        ovp=float(data.get("ovp", 18.0)),
        ocp=float(data.get("ocp", 1.0)),
        output_on=bool(data.get("output", data.get("output_on", False))),
        prot_latched=bool(data.get("prot_latched", False)),
        measured=MeasuredValues(
            voltage=measured_raw.get("voltage"),
            current=measured_raw.get("current"),
            power=measured_raw.get("power"),
        ),
    )


def load_state_file(path: str | Path) -> DeviceState:
    """Load device state from a JSON or YAML preset file."""
    file_path = Path(path)
    raw = file_path.read_text(encoding="utf-8")
    if file_path.suffix.lower() in {".yaml", ".yml"}:
        data = yaml.safe_load(raw)
    elif file_path.suffix.lower() == ".json":
        data = json.loads(raw)
    else:
        raise ValueError(f"Unsupported state file type: {file_path.suffix}")

    if not isinstance(data, dict):
        raise ValueError("State file root must be a mapping")

    state = DeviceState()
    idn = data.get("idn", {})
    state.manufacturer = str(idn.get("manufacturer", state.manufacturer))
    state.model = str(idn.get("model", state.model))
    state.serial = str(idn.get("serial", state.serial))
    state.fw_version = str(idn.get("fw_version", state.fw_version))
    state.remote = bool(data.get("remote", state.remote))

    channels_raw = data.get("channels", {})
    if channels_raw:
        state.channels = {
            ch.upper(): _parse_channel(ch_data)
            for ch, ch_data in channels_raw.items()
        }

    error_queue = data.get("error_queue", [])
    state.error_queue = [
        (int(item[0]), str(item[1]))
        for item in error_queue
        if isinstance(item, (list, tuple)) and len(item) == 2
    ]

    return state


def dump_state(state: DeviceState) -> dict[str, Any]:
    """Serialize device state for control socket STATUS responses."""
    return {
        "idn": {
            "manufacturer": state.manufacturer,
            "model": state.model,
            "serial": state.serial,
            "fw_version": state.fw_version,
        },
        "remote": state.remote,
        "channels": {
            ch: {
                "voltage": ch_state.voltage_set,
                "current": ch_state.current_set,
                "ovp": ch_state.ovp,
                "ocp": ch_state.ocp,
                "output": ch_state.output_on,
                "prot_latched": ch_state.prot_latched,
                "measured": {
                    "voltage": ch_state.measured_voltage(),
                    "current": ch_state.measured_current(),
                    "power": ch_state.measured_power(),
                },
            }
            for ch, ch_state in state.channels.items()
        },
        "error_queue": [list(item) for item in state.error_queue],
    }


def normalize_command(raw: str) -> str:
    """Normalize SCPI command text (strip terminators, collapse whitespace)."""
    text = raw.strip()
    text = re.sub(r"[\r\n]+$", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.upper()


def parse_channel_token(token: str) -> str:
    token = token.strip().upper()
    if token in {"CH1", "1", "A"}:
        return "CH1"
    if token in {"CH2", "2", "B"}:
        return "CH2"
    raise ValueError(f"Unknown channel: {token}")
