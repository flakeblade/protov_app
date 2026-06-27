import type { DeviceDisplaySettings } from './device_io'

export const DISPLAY_PENDING_TIMEOUT_MS = 5000

type BrightnessField = 'lcdBrightness' | 'ledBrightness'

const BRIGHTNESS_FIELDS: readonly BrightnessField[] = ['lcdBrightness', 'ledBrightness']

function fieldKey(deviceId: string, field: BrightnessField): string {
  return `${deviceId}:${field}`
}

/** Keep optimistic brightness while polls may still return the previous value. */
export function mergePolledDisplaySettings(
  polled: DeviceDisplaySettings,
  deviceId: string,
  pending: Map<string, number>,
  onConfirmed?: (key: string) => void,
): DeviceDisplaySettings {
  let next: DeviceDisplaySettings | null = null

  for (const field of BRIGHTNESS_FIELDS) {
    const key = fieldKey(deviceId, field)
    const expected = pending.get(key)
    if (expected === undefined) continue

    if (polled[field] === expected) {
      pending.delete(key)
      onConfirmed?.(key)
      continue
    }

    if (next === null) {
      next = { ...polled }
    }
    next[field] = expected
  }

  return next ?? polled
}

export class PendingDisplaySettings {
  private readonly pending = new Map<string, number>()
  private readonly timers = new Map<string, number>()

  set(deviceId: string, field: BrightnessField, value: number): void {
    const key = fieldKey(deviceId, field)
    this.pending.set(key, value)
    this.resetTimer(key)
  }

  clear(deviceId: string, field: BrightnessField): void {
    const key = fieldKey(deviceId, field)
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
      if (!key.startsWith(prefix)) continue
      this.pending.delete(key)
      const timer = this.timers.get(key)
      if (timer !== undefined) {
        window.clearTimeout(timer)
        this.timers.delete(key)
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

  merge(deviceId: string, polled: DeviceDisplaySettings): DeviceDisplaySettings {
    return mergePolledDisplaySettings(polled, deviceId, this.pending, (key) => {
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
    }, DISPLAY_PENDING_TIMEOUT_MS)
    this.timers.set(key, timer)
  }
}
