import { CHANNEL_IDENTIFIERS } from '../serial/constants'

export const MAX_DEVICES = 4

/** Channel color pairs — slot 0 is assigned to the first device added in a session. */
export const DEVICE_COLOR_PAIRS = [
  { A: 'RED', B: 'BLUE' },
  { A: 'YELLOW', B: 'GREEN' },
  { A: 'ORANGE', B: 'TEAL' },
  { A: 'VIOLET', B: 'PINK' },
] as const

export type ChannelIdentifier = (typeof CHANNEL_IDENTIFIERS)[number]
export type DeviceColorScheme = (typeof DEVICE_COLOR_PAIRS)[number]

export function mantineColorFromScpi(scpiColor: string): string {
  return scpiColor.trim().toLowerCase()
}

export function colorSchemeForSlot(slotIndex: number): DeviceColorScheme {
  return DEVICE_COLOR_PAIRS[slotIndex % MAX_DEVICES]
}

/** Lowest unused color slot, or a serial's previous slot when that pair is free again. */
export function acquireColorSlot(
  serialNumber: string,
  connectedDevices: { serialNumber: string; colorSlot: number }[],
  serialSlotHistory: ReadonlyMap<string, number>,
): number {
  const used = new Set(connectedDevices.map((device) => device.colorSlot))

  const previous = serialSlotHistory.get(serialNumber)
  if (previous !== undefined && !used.has(previous)) {
    return previous
  }

  for (let slot = 0; slot < MAX_DEVICES; slot += 1) {
    if (!used.has(slot)) {
      return slot
    }
  }

  throw new Error('No color slots available')
}

export function rememberColorSlot(
  serialSlotHistory: Map<string, number>,
  serialNumber: string,
  slotIndex: number,
): void {
  serialSlotHistory.set(serialNumber, slotIndex)
}
