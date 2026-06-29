/** Discrete graph sampling rates from 0.1 Hz to 20 Hz (denser than pure log steps). */
export const SAMPLING_RATES_HZ = [
  0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5, 7, 10, 15, 20,
] as const

export type SamplingRateHz = (typeof SAMPLING_RATES_HZ)[number]

export const DEFAULT_SAMPLING_RATE_HZ: SamplingRateHz = 5

export function formatSamplingRate(hz: number): string {
  if (hz >= 10) return `${hz} Hz`
  if (hz >= 1) return `${Number.isInteger(hz) ? hz : hz.toFixed(1)} Hz`
  return `${hz.toFixed(1)} Hz`
}

/** Compact tick labels for rate sliders (avoid mark overflow). */
export function formatSamplingRateMark(hz: number): string {
  if (hz >= 10) return `${hz}`
  if (hz >= 1) return Number.isInteger(hz) ? `${hz}` : hz.toFixed(1)
  return hz.toFixed(1)
}

export function samplingRateIndex(hz: number): number {
  const index = SAMPLING_RATES_HZ.findIndex((rate) => rate === hz)
  return index >= 0 ? index : SAMPLING_RATES_HZ.indexOf(DEFAULT_SAMPLING_RATE_HZ)
}

export function samplingRateFromIndex(index: number): SamplingRateHz {
  const clamped = Math.min(Math.max(0, index), SAMPLING_RATES_HZ.length - 1)
  return SAMPLING_RATES_HZ[clamped]
}

export function intervalMsForRate(hz: number): number {
  return Math.round(1000 / hz)
}
