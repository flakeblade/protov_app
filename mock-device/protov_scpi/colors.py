"""RGB u8 helpers for SCPI COLR commands."""

from __future__ import annotations

DEFAULT_CHANNEL_RGB = {
    "CH1": (234, 67, 53),
    "CH2": (66, 133, 244),
}

DEFAULT_LCD_BRIGHTNESS = 128
DEFAULT_LED_BRIGHTNESS = 255


def clamp_u8(value: int) -> int:
    return max(0, min(255, value))


def parse_rgb(raw: str) -> tuple[int, int, int]:
    parts = raw.strip().split(",")
    if len(parts) != 3:
        raise ValueError(f"Invalid RGB triplet: {raw}")

    values = [int(part.strip()) for part in parts]
    if any(value < 0 or value > 255 for value in values):
        raise ValueError(f"RGB values out of range (0-255): {raw}")

    return values[0], values[1], values[2]


def format_rgb(r: int, g: int, b: int) -> str:
    return f"{clamp_u8(r)},{clamp_u8(g)},{clamp_u8(b)}"


def parse_brightness(raw: str) -> int:
    try:
        value = int(raw.strip())
    except ValueError as exc:
        raise ValueError(f"Invalid brightness value: {raw}") from exc
    if value < 0 or value > 255:
        raise ValueError(f"Brightness out of range (0-255): {value}")
    return value
