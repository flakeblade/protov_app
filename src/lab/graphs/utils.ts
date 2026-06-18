import type { GraphMetric, SelectionStats, TimeSeriesPoint, TimeWindow, YAxisRange } from './types'

export function computeStats(values: number[]): Pick<SelectionStats, 'mean' | 'stddev' | 'n'> | null {
  const n = values.length
  if (n === 0) return null

  const mean = values.reduce((sum, value) => sum + value, 0) / n
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n

  return { mean, stddev: Math.sqrt(variance), n }
}

export function filterPointsByWindow(points: TimeSeriesPoint[], window: TimeWindow) {
  return points.filter((point) => point.t >= window.start && point.t <= window.end)
}

export function filterPointsByTimeRange(points: TimeSeriesPoint[], tStart: number, tEnd: number) {
  const start = Math.min(tStart, tEnd)
  const end = Math.max(tStart, tEnd)
  return points.filter((point) => point.t >= start && point.t <= end)
}

export function resolveYAxis(
  points: TimeSeriesPoint[],
  range: YAxisRange,
  fallback: { min: number; max: number },
) {
  if (range.min !== null && range.max !== null) {
    return { min: range.min, max: range.max }
  }

  if (points.length === 0) {
    return fallback
  }

  const values = points.map((point) => point.value)
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const span = Math.max(dataMax - dataMin, 0.001)
  const padding = span * 0.1

  return {
    min: range.min ?? dataMin - padding,
    max: range.max ?? dataMax + padding,
  }
}

export function nearestPoint(points: TimeSeriesPoint[], t: number) {
  if (points.length === 0) return null

  let low = 0
  let high = points.length - 1

  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (points[mid].t < t) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  const candidate = points[low]
  const previous = points[low - 1]

  if (!previous) return candidate
  return Math.abs(previous.t - t) <= Math.abs(candidate.t - t) ? previous : candidate
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function formatAxisTime(t: number, origin: number) {
  return formatDuration(t - origin)
}

function lookupAtTime(points: TimeSeriesPoint[], t: number) {
  const match = nearestPoint(points, t)
  if (!match) return ''
  return match.value.toFixed(6)
}

export function downloadWindowCsv(
  filename: string,
  series: Record<GraphMetric, TimeSeriesPoint[]>,
  window: TimeWindow,
) {
  const voltage = filterPointsByWindow(series.voltage, window)
  const current = filterPointsByWindow(series.current, window)
  const power = filterPointsByWindow(series.power, window)

  const header = 'timestamp_ms,voltage_V,current_A,power_W'
  const rows = voltage.map(
    (point) =>
      `${point.t},${point.value.toFixed(6)},${lookupAtTime(current, point.t)},${lookupAtTime(power, point.t)}`,
  )

  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function clampWindow(window: TimeWindow, dataStart: number, dataEnd: number, minSpan = 1000) {
  const span = Math.max(minSpan, window.end - window.start)
  let start = window.start
  let end = window.end

  if (end - start < minSpan) {
    end = start + minSpan
  }

  if (start < dataStart) {
    start = dataStart
    end = Math.min(dataStart + span, dataEnd)
  }

  if (end > dataEnd) {
    end = dataEnd
    start = Math.max(dataEnd - span, dataStart)
  }

  return { start, end }
}
