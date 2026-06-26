import { useCallback, useEffect, useRef, useState } from 'react'

import type { TimeWindow } from './types'
import { clampWindowToMaxSpan } from './utils'

const MIN_VIEW_MS = 5_000

interface UseGraphTimeNavigationOptions {
  dataExtent: { start: number; end: number }
  maxSpanMs: number
  isRecording: boolean
  renderGeneration: number
}

function snapToEnd(
  current: TimeWindow,
  dataEnd: number,
  dataStart: number,
  maxSpanMs: number,
): TimeWindow {
  const span = current.end - current.start
  return clampWindowToMaxSpan(
    { start: dataEnd - span, end: dataEnd },
    dataStart,
    dataEnd,
    maxSpanMs,
  )
}

function fitFullRun(
  extent: { start: number; end: number },
  maxSpanMs: number,
): TimeWindow {
  const span = Math.min(maxSpanMs, Math.max(extent.end - extent.start, MIN_VIEW_MS))
  return clampWindowToMaxSpan(
    { start: extent.end - span, end: extent.end },
    extent.start,
    extent.end,
    maxSpanMs,
  )
}

export function useGraphTimeNavigation({
  dataExtent,
  maxSpanMs,
  isRecording,
  renderGeneration,
}: UseGraphTimeNavigationOptions) {
  const [followLive, setFollowLiveState] = useState(true)
  const [fitRunWidth, setFitRunWidthState] = useState(false)
  const [window, setWindow] = useState<TimeWindow>(() => ({
    start: dataExtent.end - Math.min(maxSpanMs, Math.max(dataExtent.end - dataExtent.start, MIN_VIEW_MS)),
    end: dataExtent.end,
  }))

  const dataExtentRef = useRef(dataExtent)
  dataExtentRef.current = dataExtent
  const maxSpanRef = useRef(maxSpanMs)
  maxSpanRef.current = maxSpanMs
  const windowRef = useRef(window)
  windowRef.current = window

  const isRecordingRef = useRef(isRecording)
  isRecordingRef.current = isRecording
  const followLiveRef = useRef(followLive)
  followLiveRef.current = followLive
  const fitRunWidthRef = useRef(fitRunWidth)
  fitRunWidthRef.current = fitRunWidth

  useEffect(() => {
    if (!isRecording) {
      setFitRunWidthState(false)
    }
  }, [isRecording])

  useEffect(() => {
    if (fitRunWidth && isRecording) {
      setWindow((current) => {
        const next = fitFullRun(dataExtent, maxSpanRef.current)
        if (current.start === next.start && current.end === next.end) return current
        return next
      })
      return
    }

    if (!followLive) return

    setWindow((current) => {
      const next = snapToEnd(
        current,
        dataExtent.end,
        dataExtent.start,
        maxSpanRef.current,
      )
      if (current.start === next.start && current.end === next.end) return current
      return next
    })
  }, [dataExtent.end, dataExtent.start, fitRunWidth, followLive, isRecording, renderGeneration])

  const disableAutoModes = useCallback(() => {
    setFollowLiveState(false)
    setFitRunWidthState(false)
  }, [])

  const setViewport = useCallback((next: TimeWindow) => {
    disableAutoModes()
    const extent = dataExtentRef.current
    setWindow(clampWindowToMaxSpan(next, extent.start, extent.end, maxSpanRef.current))
  }, [disableAutoModes])

  const setFollowLive = useCallback((value: boolean) => {
    setFollowLiveState(value)
    if (value) {
      setFitRunWidthState(false)
    }
    if (!value) return

    const extent = dataExtentRef.current
    setWindow((current) =>
      snapToEnd(current, extent.end, extent.start, maxSpanRef.current),
    )
  }, [])

  const setFitRunWidth = useCallback((value: boolean) => {
    if (!isRecordingRef.current) {
      setFitRunWidthState(false)
      if (value) {
        const extent = dataExtentRef.current
        setWindow(fitFullRun(extent, maxSpanRef.current))
        setFollowLiveState(false)
      }
      return
    }

    setFitRunWidthState(value)
    if (value) {
      setFollowLiveState(true)
      setWindow(fitFullRun(dataExtentRef.current, maxSpanRef.current))
    }
  }, [])

  const panBy = useCallback((deltaMs: number) => {
    disableAutoModes()
    const extent = dataExtentRef.current
    const current = windowRef.current
    setWindow(
      clampWindowToMaxSpan(
        { start: current.start + deltaMs, end: current.end + deltaMs },
        extent.start,
        extent.end,
        maxSpanRef.current,
      ),
    )
  }, [disableAutoModes])

  const zoomBy = useCallback((factor: number) => {
    const extent = dataExtentRef.current
    const current = windowRef.current
    const nextSpan = Math.min(
      maxSpanRef.current,
      Math.max(MIN_VIEW_MS, (current.end - current.start) * factor),
    )

    const keepLiveFollow =
      isRecordingRef.current && (followLiveRef.current || fitRunWidthRef.current)

    if (keepLiveFollow) {
      if (fitRunWidthRef.current) {
        setFitRunWidthState(false)
      }
      setFollowLiveState(true)
      const liveEnd = extent.end
      setWindow(
        clampWindowToMaxSpan(
          { start: liveEnd - nextSpan, end: liveEnd },
          extent.start,
          extent.end,
          maxSpanRef.current,
        ),
      )
      return
    }

    disableAutoModes()
    const center = (current.start + current.end) / 2
    setWindow(
      clampWindowToMaxSpan(
        { start: center - nextSpan / 2, end: center + nextSpan / 2 },
        extent.start,
        extent.end,
        maxSpanRef.current,
      ),
    )
  }, [disableAutoModes])

  const scrollToStart = useCallback(() => {
    disableAutoModes()
    const extent = dataExtentRef.current
    const span = windowRef.current.end - windowRef.current.start
    setWindow(
      clampWindowToMaxSpan(
        { start: extent.start, end: extent.start + span },
        extent.start,
        extent.end,
        maxSpanRef.current,
      ),
    )
  }, [disableAutoModes])

  const scrollToEnd = useCallback(() => {
    if (isRecordingRef.current) {
      setFitRunWidthState(false)
      setFollowLive(true)
      return
    }

    disableAutoModes()
    const extent = dataExtentRef.current
    setWindow((current) =>
      snapToEnd(current, extent.end, extent.start, maxSpanRef.current),
    )
  }, [disableAutoModes, setFollowLive])

  const resetNavigation = useCallback(() => {
    setFollowLiveState(true)
    setFitRunWidthState(false)
    const extent = dataExtentRef.current
    const span = Math.min(maxSpanRef.current, MIN_VIEW_MS * 2)
    setWindow(
      clampWindowToMaxSpan(
        { start: extent.end - span, end: extent.end },
        extent.start,
        extent.end,
        maxSpanRef.current,
      ),
    )
  }, [])

  return {
    window,
    followLive,
    fitRunWidth,
    setViewport,
    setFollowLive,
    setFitRunWidth,
    panBy,
    zoomBy,
    scrollToStart,
    scrollToEnd,
    resetNavigation,
  }
}
