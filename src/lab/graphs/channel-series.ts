import type { GraphMetric, TimeSeriesBuffer } from './types'

export function channelSeriesKey(deviceId: string, channelIdentifier: string): string {
  return `${deviceId}:${channelIdentifier}`
}

export function createEmptySeries(): Record<GraphMetric, TimeSeriesBuffer> {
  return {
    voltage: { points: [] },
    current: { points: [] },
    power: { points: [] },
  }
}

function trimBufferToCount(buffer: TimeSeriesBuffer, maxSamples: number): void {
  const extra = buffer.points.length - maxSamples
  if (extra > 0) {
    buffer.points.splice(0, extra)
  }
}

export function trimSeriesToCount(
  series: Record<GraphMetric, TimeSeriesBuffer>,
  maxSamples: number,
): Record<GraphMetric, TimeSeriesBuffer> {
  const keep = Math.max(maxSamples, 0)
  return {
    voltage: { points: series.voltage.points.slice(-keep) },
    current: { points: series.current.points.slice(-keep) },
    power: { points: series.power.points.slice(-keep) },
  }
}

export function appendSampleInPlace(
  series: Record<GraphMetric, TimeSeriesBuffer>,
  sample: { t: number; voltage: number; current: number },
  maxSamples: number,
): void {
  const power = sample.voltage * sample.current

  series.voltage.points.push({ t: sample.t, value: sample.voltage })
  series.current.points.push({ t: sample.t, value: sample.current })
  series.power.points.push({ t: sample.t, value: power })

  trimBufferToCount(series.voltage, maxSamples)
  trimBufferToCount(series.current, maxSamples)
  trimBufferToCount(series.power, maxSamples)
}

export function ensureChannelSeries(
  map: Map<string, Record<GraphMetric, TimeSeriesBuffer>>,
  deviceId: string,
  channelIdentifier: string,
): Record<GraphMetric, TimeSeriesBuffer> {
  const key = channelSeriesKey(deviceId, channelIdentifier)
  let series = map.get(key)
  if (!series) {
    series = createEmptySeries()
    map.set(key, series)
  }
  return series
}

export function pruneSeriesMap(
  map: Map<string, Record<GraphMetric, TimeSeriesBuffer>>,
  activeKeys: Set<string>,
): void {
  for (const key of map.keys()) {
    if (!activeKeys.has(key)) {
      map.delete(key)
    }
  }
}

export function clearSeriesMap(
  map: Map<string, Record<GraphMetric, TimeSeriesBuffer>>,
  activeKeys: Iterable<string>,
): void {
  for (const key of activeKeys) {
    map.set(key, createEmptySeries())
  }
}

export function dataExtentFromSeries(
  series: Record<GraphMetric, TimeSeriesBuffer>,
  fallbackSpanMs: number,
  fallbackEndMs: number,
): { start: number; end: number } {
  const points = series.voltage.points
  if (points.length === 0) {
    return { start: fallbackEndMs - fallbackSpanMs, end: fallbackEndMs }
  }
  return { start: points[0].t, end: points[points.length - 1].t }
}

export function combinedDataExtent(
  extents: { start: number; end: number }[],
  fallbackSpanMs: number,
  fallbackEndMs: number,
): { start: number; end: number } {
  if (extents.length === 0) {
    return { start: fallbackEndMs - fallbackSpanMs, end: fallbackEndMs }
  }
  return {
    start: Math.min(...extents.map((extent) => extent.start)),
    end: Math.max(...extents.map((extent) => extent.end)),
  }
}
