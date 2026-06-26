"""Channel color names for SCPI COLR commands."""

from __future__ import annotations

VALID_CHANNEL_COLORS = frozenset(
    {
        "RED",
        "BLUE",
        "YELLOW",
        "GREEN",
        "ORANGE",
        "TEAL",
        "VIOLET",
        "PINK",
        "CYAN",
        "LIME",
        "GRAY",
    }
)

DEFAULT_CHANNEL_COLORS = {
    "CH1": "RED",
    "CH2": "BLUE",
}


def normalize_color_name(raw: str) -> str:
    color = raw.strip().upper()
    if color not in VALID_CHANNEL_COLORS:
        raise ValueError(f"Unsupported channel color: {raw}")
    return color


def color_to_mantine(color: str) -> str:
    return color.lower()
