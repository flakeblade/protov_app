import { CHANNEL_IDENTIFIERS } from '../serial/constants'
import {
  colorPairForSlot,
  type ChannelColor,
} from './channel-colors'

export type { ChannelColor, ChannelIdentifier, DeviceColorPair } from './channel-colors'
export {
  CHANNEL_COLORS,
  DEFAULT_DEVICE_COLOR_PAIRS,
  colorPairForSlot,
  isChannelColor,
} from './channel-colors'

export const MAX_DEVICES = 4

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

export function defaultColorForChannel(slotIndex: number, identifier: string): ChannelColor {
  const pair = colorPairForSlot(slotIndex)
  return identifier === CHANNEL_IDENTIFIERS[0] ? pair.A : pair.B
}
