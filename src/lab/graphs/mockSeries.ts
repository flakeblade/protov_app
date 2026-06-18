import type { GraphMetric, TimeSeriesBuffer, TimeSeriesPoint } from './types'

const SAMPLE_INTERVAL_MS = 100
const DURATION_MS = 5 * 60 * 1000

function seededNoise(seed: number, t: number) {
  const x = Math.sin(seed * 12.9898 + t * 0.0173) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

function generateMetricSeries(
  metric: GraphMetric,
  seed: number,
  now: number,
): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = []
  const start = now - DURATION_MS

  for (let t = start; t <= now; t += SAMPLE_INTERVAL_MS) {
    const phase = (t - start) / DURATION_MS
    let value = 0

    if (metric === 'voltage') {
      value = 3.3 + Math.sin(phase * Math.PI * 4 + seed) * 0.4 + seededNoise(seed, t) * 0.05
    } else if (metric === 'current') {
      value = 0.5 + Math.cos(phase * Math.PI * 6 + seed * 0.5) * 0.15 + seededNoise(seed + 3, t) * 0.02
    } else {
      const voltage = 3.3 + Math.sin(phase * Math.PI * 4 + seed) * 0.4
      const current = 0.5 + Math.cos(phase * Math.PI * 6 + seed * 0.5) * 0.15
      value = voltage * current
    }

    points.push({ t, value: Math.max(0, value) })
  }

  return points
}

export function createMockChannelSeries(
  channelSeed: number,
  now = Date.now(),
): Record<GraphMetric, TimeSeriesBuffer> {
  return {
    voltage: { points: generateMetricSeries('voltage', channelSeed, now) },
    current: { points: generateMetricSeries('current', channelSeed + 1, now) },
    power: { points: generateMetricSeries('power', channelSeed + 2, now) },
  }
}

/** Example hook point for future live ingestion */
export function appendPoint(buffer: TimeSeriesBuffer, point: TimeSeriesPoint) {
  buffer.points.push(point)
}
