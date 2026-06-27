import { DEFAULT_THEME, type MantineColor } from '@mantine/core'

import { CHANNEL_IDENTIFIERS } from '../serial/constants'

export type ChannelIdentifier = (typeof CHANNEL_IDENTIFIERS)[number]

/** Mantine palette names available for channels (excludes dark, gray). */
export const CHANNEL_COLORS = [
  'red',
  'pink',
  'grape',
  'violet',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'green',
  'lime',
  'yellow',
  'orange',
] as const satisfies readonly MantineColor[]

export type ChannelColor = (typeof CHANNEL_COLORS)[number]

export interface DeviceColorPair {
  A: ChannelColor
  B: ChannelColor
}

/** Default Mantine color pairs per connected-device slot. */
export const DEFAULT_DEVICE_COLOR_PAIRS: readonly DeviceColorPair[] = [
  { A: 'red', B: 'blue' },
  { A: 'green', B: 'yellow' },
  { A: 'orange', B: 'indigo' },
  { A: 'pink', B: 'cyan' },
] as const

export interface RgbTriplet {
  r: number
  g: number
  b: number
}

const COLOR_LOOKUP = new Set<string>(CHANNEL_COLORS)

/** Mantine filled-badge shade used for RGB encoding and swatches. */
const RGB_SHADE = 6

const PALETTE_RGB: Record<ChannelColor, RgbTriplet> = Object.fromEntries(
  CHANNEL_COLORS.map((color) => [color, hexToRgb(DEFAULT_THEME.colors[color][RGB_SHADE])]),
) as Record<ChannelColor, RgbTriplet>

export function isChannelColor(value: string): value is ChannelColor {
  return COLOR_LOOKUP.has(value)
}

export function colorPairForSlot(slotIndex: number): DeviceColorPair {
  return DEFAULT_DEVICE_COLOR_PAIRS[slotIndex % DEFAULT_DEVICE_COLOR_PAIRS.length]
}

export function mantineColorToRgb(color: ChannelColor): RgbTriplet {
  return PALETTE_RGB[color]
}

export function rgbToNearestChannelColor(r: number, g: number, b: number): ChannelColor {
  let best: ChannelColor = 'red'
  let bestDistance = Number.POSITIVE_INFINITY

  for (const color of CHANNEL_COLORS) {
    const triplet = PALETTE_RGB[color]
    const distance =
      (triplet.r - r) ** 2 + (triplet.g - g) ** 2 + (triplet.b - b) ** 2
    if (distance < bestDistance) {
      bestDistance = distance
      best = color
    }
  }

  return best
}

export function formatColrScpi(rgb: RgbTriplet): string {
  return `${clampU8(rgb.r)},${clampU8(rgb.g)},${clampU8(rgb.b)}`
}

export function parseColrScpi(raw: string): RgbTriplet {
  const parts = raw.trim().split(',')
  if (parts.length !== 3) {
    throw new Error(`Invalid COLR response: ${raw}`)
  }

  const values = parts.map((part) => Number.parseInt(part.trim(), 10))
  if (values.some((value) => Number.isNaN(value))) {
    throw new Error(`Invalid COLR response: ${raw}`)
  }

  const [r, g, b] = values
  if ([r, g, b].some((value) => value < 0 || value > 255)) {
    throw new Error(`COLR values out of range (0-255): ${raw}`)
  }

  return { r, g, b }
}

export function clampU8(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function hexToRgb(hex: string): RgbTriplet {
  const normalized = hex.replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}
