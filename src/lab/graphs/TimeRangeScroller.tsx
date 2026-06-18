import { useCallback, useRef, useState } from 'react'

import { clampWindow } from './utils'
import type { TimeWindow } from './types'
import classes from './TimeRangeScroller.module.css'

const MIN_WINDOW_MS = 5_000
const HANDLE_RADIUS_PX = 7

interface TimeRangeScrollerProps {
  dataStart: number
  dataEnd: number
  window: TimeWindow
  onWindowChange: (window: TimeWindow) => void
}

type DragMode = 'start' | 'end' | 'pan' | null

function toRatio(value: number, start: number, end: number) {
  if (end <= start) return 0
  return (value - start) / (end - start)
}

function fromRatio(ratio: number, start: number, end: number) {
  return start + ratio * (end - start)
}

export function TimeRangeScroller({
  dataStart,
  dataEnd,
  window,
  onWindowChange,
}: TimeRangeScrollerProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragMode, setDragMode] = useState<DragMode>(null)
  const panOffsetRef = useRef(0)

  const startRatio = toRatio(window.start, dataStart, dataEnd)
  const endRatio = toRatio(window.end, dataStart, dataEnd)

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return dataStart

      const rect = track.getBoundingClientRect()
      const usableWidth = rect.width - HANDLE_RADIUS_PX * 2
      const x = Math.min(Math.max(clientX - rect.left - HANDLE_RADIUS_PX, 0), usableWidth)
      const ratio = usableWidth === 0 ? 0 : x / usableWidth
      return fromRatio(ratio, dataStart, dataEnd)
    },
    [dataEnd, dataStart],
  )

  const finishDrag = useCallback(() => {
    setDragMode(null)
    panOffsetRef.current = 0
  }, [])

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragMode) return

      if (dragMode === 'start') {
        const nextStart = Math.min(timeFromClientX(event.clientX), window.end - MIN_WINDOW_MS)
        onWindowChange(clampWindow({ start: nextStart, end: window.end }, dataStart, dataEnd, MIN_WINDOW_MS))
        return
      }

      if (dragMode === 'end') {
        const nextEnd = Math.max(timeFromClientX(event.clientX), window.start + MIN_WINDOW_MS)
        onWindowChange(clampWindow({ start: window.start, end: nextEnd }, dataStart, dataEnd, MIN_WINDOW_MS))
        return
      }

      const pointerTime = timeFromClientX(event.clientX)
      const delta = pointerTime - panOffsetRef.current
      onWindowChange(
        clampWindow(
          { start: window.start + delta, end: window.end + delta },
          dataStart,
          dataEnd,
          MIN_WINDOW_MS,
        ),
      )
      panOffsetRef.current = pointerTime
    },
    [dataEnd, dataStart, dragMode, onWindowChange, timeFromClientX, window.end, window.start],
  )

  return (
    <div
      className={classes.timeScroller}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerLeave={finishDrag}
    >
      <div ref={trackRef} className={classes.track} />

      <div
        className={`${classes.selection} ${dragMode === 'pan' ? classes.selectionDragging : ''}`}
        style={{
          left: `calc(${startRatio * 100}% + ${HANDLE_RADIUS_PX}px)`,
          width: `calc(${(endRatio - startRatio) * 100}% - ${HANDLE_RADIUS_PX * 2}px)`,
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragMode('pan')
          panOffsetRef.current = timeFromClientX(event.clientX)
        }}
      />

      <button
        type="button"
        aria-label="Adjust window start"
        className={classes.handle}
        style={{ left: `calc(${startRatio * 100}% + ${HANDLE_RADIUS_PX}px)` }}
        onPointerDown={(event) => {
          event.stopPropagation()
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragMode('start')
        }}
      />

      <button
        type="button"
        aria-label="Adjust window end"
        className={classes.handle}
        style={{ left: `calc(${endRatio * 100}% - ${HANDLE_RADIUS_PX}px)` }}
        onPointerDown={(event) => {
          event.stopPropagation()
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragMode('end')
        }}
      />
    </div>
  )
}
