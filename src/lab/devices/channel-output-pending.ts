import type { Channel } from '../components/channel_chip'

export const OUTPUT_PENDING_TIMEOUT_MS = 5000

export function channelOutputKey(deviceId: string, channelIdentifier: string): string {
  return `${deviceId}:${channelIdentifier}`
}

/** Adjust display fields when output on/off changes locally. */
export function adjustChannelForActive(channel: Channel, active: boolean): Channel {
  if (channel.active === active) return channel

  if (!active) {
    return {
      ...channel,
      active: false,
      measuredVoltage: 0,
      measuredCurrent: 0,
      voltage: channel.voltageSet,
      current: channel.currentSet,
    }
  }

  return {
    ...channel,
    active: true,
    voltage: channel.measuredVoltage || channel.voltageSet,
    current: channel.measuredCurrent || channel.currentSet,
  }
}

/**
 * Keep optimistic output state while background polls may still return the previous value.
 * Clears pending entries once the device reports the requested state.
 */
export function mergePolledChannels(
  polled: Channel[],
  deviceId: string,
  pendingOutput: Map<string, boolean>,
  onConfirmed?: (key: string) => void,
): Channel[] {
  return polled.map((channel) => {
    const key = channelOutputKey(deviceId, channel.identifier)
    const pending = pendingOutput.get(key)
    if (pending === undefined) return channel

    if (channel.active === pending) {
      pendingOutput.delete(key)
      onConfirmed?.(key)
      return channel
    }

    return adjustChannelForActive(channel, pending)
  })
}

export class PendingChannelOutput {
  private readonly pending = new Map<string, boolean>()
  private readonly timers = new Map<string, number>()

  set(deviceId: string, channelIdentifier: string, active: boolean): void {
    const key = channelOutputKey(deviceId, channelIdentifier)
    this.pending.set(key, active)
    this.resetTimer(key)
  }

  setMany(deviceId: string, channelIdentifiers: readonly string[], active: boolean): void {
    for (const channelIdentifier of channelIdentifiers) {
      this.set(deviceId, channelIdentifier, active)
    }
  }

  clear(deviceId: string, channelIdentifier: string): void {
    const key = channelOutputKey(deviceId, channelIdentifier)
    this.pending.delete(key)
    const timer = this.timers.get(key)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      this.timers.delete(key)
    }
  }

  clearDevice(deviceId: string): void {
    const prefix = `${deviceId}:`
    for (const key of [...this.pending.keys()]) {
      if (key.startsWith(prefix)) {
        this.pending.delete(key)
        const timer = this.timers.get(key)
        if (timer !== undefined) {
          window.clearTimeout(timer)
          this.timers.delete(key)
        }
      }
    }
  }

  clearAll(): void {
    this.pending.clear()
    for (const timer of this.timers.values()) {
      window.clearTimeout(timer)
    }
    this.timers.clear()
  }

  merge(deviceId: string, polled: Channel[]): Channel[] {
    return mergePolledChannels(polled, deviceId, this.pending, (key) => {
      const timer = this.timers.get(key)
      if (timer !== undefined) {
        window.clearTimeout(timer)
        this.timers.delete(key)
      }
    })
  }

  private resetTimer(key: string): void {
    const existing = this.timers.get(key)
    if (existing !== undefined) {
      window.clearTimeout(existing)
    }

    const timer = window.setTimeout(() => {
      this.pending.delete(key)
      this.timers.delete(key)
    }, OUTPUT_PENDING_TIMEOUT_MS)
    this.timers.set(key, timer)
  }
}
