export type GraphMetric = 'voltage' | 'current' | 'power'

export interface TimeSeriesPoint {
  /** Unix timestamp in milliseconds */
  t: number
  value: number
}

/** Append-only buffer shape for future real-time ingestion */
export interface TimeSeriesBuffer {
  points: TimeSeriesPoint[]
}

export interface TimeWindow {
  start: number
  end: number
}

export interface YAxisRange {
  min: number | null
  max: number | null
}

export interface SelectionStats {
  mean: number
  stddev: number
  n: number
  tStart: number
  tEnd: number
}

export interface MetricConfig {
  label: string
  unit: string
  decimals: number
  defaultMin: number
  defaultMax: number
}

export const METRIC_CONFIG: Record<GraphMetric, MetricConfig> = {
  voltage: { label: 'Voltage', unit: 'V', decimals: 3, defaultMin: 0, defaultMax: 20 },
  current: { label: 'Current', unit: 'A', decimals: 3, defaultMin: 0, defaultMax: 5 },
  power: { label: 'Power', unit: 'W', decimals: 3, defaultMin: 0, defaultMax: 100 },
}
