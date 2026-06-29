/** Fixed mock slot profiles (matches protov-hal-mock SLOT_PROFILES + app color pairs). */

export type ChannelId = 'A' | 'B'

export type MantineChannelColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'indigo'
  | 'pink'
  | 'cyan'

export interface MockSlotProfile {
  slot: number
  serial: string
  fw: string
  hw: string
  colors: Record<ChannelId, MantineChannelColor>
}

/** Mantine default theme shade 6 (matches channel-colors RGB_SHADE). */
export const CHANNEL_COLOR_RGB: Record<MantineChannelColor, string> = {
  red: 'rgb(250, 82, 82)',
  blue: 'rgb(34, 139, 230)',
  green: 'rgb(64, 192, 87)',
  yellow: 'rgb(250, 176, 5)',
  orange: 'rgb(253, 126, 20)',
  indigo: 'rgb(76, 110, 245)',
  pink: 'rgb(230, 73, 128)',
  cyan: 'rgb(21, 170, 191)',
}

export const MOCK_SLOT_PROFILES: readonly MockSlotProfile[] = [
  {
    slot: 0,
    serial: '550e8400',
    fw: '1.0.0',
    hw: 'A.1',
    colors: { A: 'red', B: 'blue' },
  },
  {
    slot: 1,
    serial: '32983fe4',
    fw: '1.0.1',
    hw: 'B.2',
    colors: { A: 'green', B: 'yellow' },
  },
  {
    slot: 2,
    serial: 'deadbeef',
    fw: '0.9.0',
    hw: 'A.0',
    colors: { A: 'orange', B: 'indigo' },
  },
  {
    slot: 3,
    serial: 'a1b2c3d4',
    fw: '1.2.3',
    hw: 'C.1',
    colors: { A: 'pink', B: 'cyan' },
  },
] as const

export const MAX_MOCK_SLOTS = MOCK_SLOT_PROFILES.length

export function profileForSlot(slot: number): MockSlotProfile {
  const profile = MOCK_SLOT_PROFILES[slot]
  if (!profile) {
    throw new Error(`Invalid mock slot: ${slot}`)
  }
  return profile
}

export function profileForSerial(serial: string): MockSlotProfile | undefined {
  return MOCK_SLOT_PROFILES.find((entry) => entry.serial === serial)
}
