/** Buffer capacity in samples (log-spaced 100 … 10 000). */
export const BUFFER_SAMPLE_COUNTS = [100, 200, 500, 1000, 2000, 5000, 10_000] as const

export type BufferSampleCount = (typeof BUFFER_SAMPLE_COUNTS)[number]

export const DEFAULT_BUFFER_SAMPLE_COUNT: BufferSampleCount = 1000

export function formatBufferSampleCount(count: number): string {
  if (count >= 1000) {
    return count >= 10_000 ? '10k samples' : `${count / 1000}k samples`
  }
  return `${count} samples`
}

/** Compact tick labels for buffer sliders (avoid mark overflow). */
export function formatBufferMarkCompact(count: number): string {
  if (count >= 10_000) return '10k'
  if (count >= 1000) return `${count / 1000}k`
  return String(count)
}

export function bufferSampleCountIndex(count: number): number {
  const index = BUFFER_SAMPLE_COUNTS.findIndex((value) => value === count)
  return index >= 0 ? index : BUFFER_SAMPLE_COUNTS.indexOf(DEFAULT_BUFFER_SAMPLE_COUNT)
}

export function bufferSampleCountFromIndex(index: number): BufferSampleCount {
  const clamped = Math.min(Math.max(0, index), BUFFER_SAMPLE_COUNTS.length - 1)
  return BUFFER_SAMPLE_COUNTS[clamped]
}

/** Wall-clock span covered by a sample-count buffer at the given rate. */
export function bufferTimeSpanMs(sampleCount: number, sampleRateHz: number): number {
  if (sampleRateHz <= 0) return 0
  return (sampleCount / sampleRateHz) * 1000
}
