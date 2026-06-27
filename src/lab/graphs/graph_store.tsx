import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { GraphMetric, TimeSeriesBuffer } from './types'
import {
  DEFAULT_BUFFER_SAMPLE_COUNT,
  type BufferSampleCount,
} from './buffer-size'
import {
  appendSampleInPlace,
  channelSeriesKey,
  clearSeriesMap,
  createEmptySeries,
  ensureChannelSeries,
  pruneSeriesMap,
  trimSeriesToCount,
} from './channel-series'
import {
  DEFAULT_SAMPLING_RATE_HZ,
  intervalMsForRate,
  type SamplingRateHz,
} from './sampling-rates'
import { useDeviceStore } from '../devices/device_store'

export type RecordingState = 'stopped' | 'running'

const UI_REFRESH_MS = 100

interface GraphStoreValue {
  recordingState: RecordingState
  isRecording: boolean
  startRecording: () => void
  stopRecording: () => void
  clearRecording: () => void
  sampleRateHz: SamplingRateHz
  setSampleRateHz: (rate: SamplingRateHz) => void
  bufferSampleCount: BufferSampleCount
  setBufferSampleCount: (count: BufferSampleCount) => void
  renderGeneration: number
  getChannelSeries: (deviceId: string, channelIdentifier: string) => Record<GraphMetric, TimeSeriesBuffer>
  latestSampleTimeMs: () => number
}

const GraphStoreContext = createContext<GraphStoreValue | null>(null)

export function useGraphStore(): GraphStoreValue {
  const value = useContext(GraphStoreContext)
  if (!value) {
    throw new Error('useGraphStore must be used within GraphStoreProvider')
  }
  return value
}

interface GraphStoreProviderProps {
  children: ReactNode
}

export function GraphStoreProvider({ children }: GraphStoreProviderProps) {
  const { devices } = useDeviceStore()
  const devicesRef = useRef(devices)
  devicesRef.current = devices

  const seriesMapRef = useRef(new Map<string, Record<GraphMetric, TimeSeriesBuffer>>())
  const latestSampleTimeRef = useRef(Date.now())

  const [recordingState, setRecordingState] = useState<RecordingState>('stopped')
  const [sampleRateHz, setSampleRateHz] = useState<SamplingRateHz>(DEFAULT_SAMPLING_RATE_HZ)
  const [bufferSampleCount, setBufferSampleCount] = useState<BufferSampleCount>(DEFAULT_BUFFER_SAMPLE_COUNT)
  const [renderGeneration, setRenderGeneration] = useState(0)

  const channelTopologyKey = devices
    .map((device) => `${device.id}:${device.channels.map((channel) => channel.identifier).join('/')}`)
    .join('|')

  const activeKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const device of devices) {
      for (const channel of device.channels) {
        keys.add(channelSeriesKey(device.id, channel.identifier))
      }
    }
    return keys
  }, [channelTopologyKey, devices])

  const activeKeysRef = useRef(activeKeys)
  activeKeysRef.current = activeKeys

  const bumpRender = useCallback(() => {
    setRenderGeneration((value) => value + 1)
  }, [])

  useEffect(() => {
    pruneSeriesMap(seriesMapRef.current, activeKeys)
    bumpRender()
  }, [activeKeys, bumpRender])

  useEffect(() => {
    const next = new Map<string, Record<GraphMetric, TimeSeriesBuffer>>()
    for (const [key, series] of seriesMapRef.current) {
      next.set(key, trimSeriesToCount(series, bufferSampleCount))
    }
    seriesMapRef.current = next
    bumpRender()
  }, [bufferSampleCount, bumpRender])

  useEffect(() => {
    if (recordingState !== 'running' || devices.length === 0) return

    let lastUiRefresh = 0

    const tick = () => {
      const snapshot = devicesRef.current
      if (snapshot.length === 0) return

      const now = Date.now()
      latestSampleTimeRef.current = now

      for (const device of snapshot) {
        for (const channel of device.channels) {
          const series = ensureChannelSeries(
            seriesMapRef.current,
            device.id,
            channel.identifier,
          )
          appendSampleInPlace(
            series,
            {
              t: now,
              voltage: channel.measuredVoltage,
              current: channel.measuredCurrent,
            },
            bufferSampleCount,
          )
        }
      }

      if (now - lastUiRefresh >= UI_REFRESH_MS) {
        lastUiRefresh = now
        bumpRender()
      }
    }

    tick()
    const timer = window.setInterval(tick, intervalMsForRate(sampleRateHz))
    return () => window.clearInterval(timer)
  }, [bufferSampleCount, bumpRender, devices.length, recordingState, sampleRateHz])

  const startRecording = useCallback(() => {
    setRecordingState('running')
  }, [])

  const stopRecording = useCallback(() => {
    setRecordingState('stopped')
  }, [])

  const clearRecording = useCallback(() => {
    clearSeriesMap(seriesMapRef.current, activeKeysRef.current)
    latestSampleTimeRef.current = Date.now()
    bumpRender()
  }, [bumpRender])

  const getChannelSeries = useCallback((deviceId: string, channelIdentifier: string) => {
    return (
      seriesMapRef.current.get(channelSeriesKey(deviceId, channelIdentifier)) ?? createEmptySeries()
    )
  }, [])

  const latestSampleTimeMs = useCallback(() => latestSampleTimeRef.current, [])

  const value = useMemo(
    () => ({
      recordingState,
      isRecording: recordingState === 'running',
      startRecording,
      stopRecording,
      clearRecording,
      sampleRateHz,
      setSampleRateHz,
      bufferSampleCount,
      setBufferSampleCount,
      renderGeneration,
      getChannelSeries,
      latestSampleTimeMs,
    }),
    [
      bufferSampleCount,
      clearRecording,
      getChannelSeries,
      latestSampleTimeMs,
      recordingState,
      renderGeneration,
      sampleRateHz,
      startRecording,
      stopRecording,
    ],
  )

  return <GraphStoreContext.Provider value={value}>{children}</GraphStoreContext.Provider>
}
