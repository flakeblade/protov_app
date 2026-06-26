import { useCallback, useRef, useState } from 'react'
import { ActionIcon, Button, Group, Text, Tooltip } from '@mantine/core'
import {
  IconChevronLeft,
  IconChevronRight,
  IconMaximize,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react'

import { clampWindow } from './utils'
import type { TimeWindow } from './types'
import classes from './TimelineNavigator.module.css'

const MIN_VIEW_MS = 5_000

interface TimelineNavigatorProps {
  dataStart: number
  dataEnd: number
  window: TimeWindow
  followLive: boolean
  fitRunWidth: boolean
  isRecording: boolean
  onViewportChange: (window: TimeWindow) => void
  onPanBy: (deltaMs: number) => void
  onZoomBy: (factor: number) => void
  onScrollToStart: () => void
  onScrollToEnd: () => void
  onFitRunWidthChange: (value: boolean) => void
  onFollowLiveChange: (value: boolean) => void
}

type DragMode = 'pan' | 'start' | 'end' | null

function toRatio(value: number, start: number, end: number) {
  if (end <= start) return 0
  return (value - start) / (end - start)
}

function fromRatio(ratio: number, start: number, end: number) {
  return start + ratio * (end - start)
}

export function TimelineNavigator({
  dataStart,
  dataEnd,
  window,
  followLive,
  fitRunWidth,
  isRecording,
  onViewportChange,
  onPanBy,
  onZoomBy,
  onScrollToStart,
  onScrollToEnd,
  onFitRunWidthChange,
  onFollowLiveChange,
}: TimelineNavigatorProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragMode, setDragMode] = useState<DragMode>(null)
  const panAnchorRef = useRef(0)

  const dataSpan = Math.max(dataEnd - dataStart, 1)
  const viewSpan = window.end - window.start
  const startRatio = toRatio(window.start, dataStart, dataEnd)
  const endRatio = toRatio(window.end, dataStart, dataEnd)

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return dataStart

      const rect = track.getBoundingClientRect()
      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
      const ratio = rect.width === 0 ? 0 : x / rect.width
      return fromRatio(ratio, dataStart, dataEnd)
    },
    [dataEnd, dataStart],
  )

  const finishDrag = useCallback(() => {
    setDragMode(null)
    panAnchorRef.current = 0
  }, [])

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragMode) return

      if (dragMode === 'start') {
        const nextStart = Math.min(timeFromClientX(event.clientX), window.end - MIN_VIEW_MS)
        onViewportChange(clampWindow({ start: nextStart, end: window.end }, dataStart, dataEnd, MIN_VIEW_MS))
        return
      }

      if (dragMode === 'end') {
        const nextEnd = Math.max(timeFromClientX(event.clientX), window.start + MIN_VIEW_MS)
        onViewportChange(clampWindow({ start: window.start, end: nextEnd }, dataStart, dataEnd, MIN_VIEW_MS))
        return
      }

      const pointerTime = timeFromClientX(event.clientX)
      const delta = pointerTime - panAnchorRef.current
      onViewportChange(
        clampWindow(
          { start: window.start + delta, end: window.end + delta },
          dataStart,
          dataEnd,
          MIN_VIEW_MS,
        ),
      )
      panAnchorRef.current = pointerTime
    },
    [dataEnd, dataStart, dragMode, onViewportChange, timeFromClientX, window.end, window.start],
  )

  const handleTrackClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return

      const clickTime = timeFromClientX(event.clientX)
      const halfSpan = viewSpan / 2
      onViewportChange(
        clampWindow(
          { start: clickTime - halfSpan, end: clickTime + halfSpan },
          dataStart,
          dataEnd,
          MIN_VIEW_MS,
        ),
      )
    },
    [dataEnd, dataStart, onViewportChange, timeFromClientX, viewSpan],
  )

  return (
    <StackLike>
      <Group gap="xs" wrap="wrap" className={classes.toolbar}>
        <Group gap={4}>
          <Tooltip label="Pan left">
            <ActionIcon
              variant="light"
              color="gray"
              size="sm"
              aria-label="Pan left"
              onClick={() => onPanBy(-viewSpan * 0.25)}
            >
              <IconChevronLeft size={16} stroke={2} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Pan right">
            <ActionIcon
              variant="light"
              color="gray"
              size="sm"
              aria-label="Pan right"
              onClick={() => onPanBy(viewSpan * 0.25)}
            >
              <IconChevronRight size={16} stroke={2} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group gap={4}>
          <Tooltip label="Zoom in">
            <ActionIcon
              variant="light"
              color="gray"
              size="sm"
              aria-label="Zoom in"
              onClick={() => onZoomBy(0.75)}
            >
              <IconZoomIn size={16} stroke={2} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Zoom out">
            <ActionIcon
              variant="light"
              color="gray"
              size="sm"
              aria-label="Zoom out"
              onClick={() => onZoomBy(1.33)}
            >
              <IconZoomOut size={16} stroke={2} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group gap={4}>
          <Tooltip label="Jump to oldest data">
            <ActionIcon
              variant="light"
              color="gray"
              size="sm"
              aria-label="Jump to start"
              onClick={onScrollToStart}
            >
              <IconPlayerSkipBack size={16} stroke={2} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={isRecording ? 'Follow live (newest data)' : 'Jump to newest data'}>
            <ActionIcon
              variant={followLive && isRecording ? 'filled' : 'light'}
              color={followLive && isRecording ? 'blue' : 'gray'}
              size="sm"
              aria-label={isRecording ? 'Follow live data' : 'Jump to end'}
              onClick={onScrollToEnd}
            >
              <IconPlayerSkipForward size={16} stroke={2} />
            </ActionIcon>
          </Tooltip>
          <Tooltip
            label={
              isRecording
                ? fitRunWidth
                  ? 'Stop fitting to full run width'
                  : 'Fit to full run width (updates live)'
                : 'Fit visible range to data'
            }
          >
            <ActionIcon
              variant={fitRunWidth && isRecording ? 'filled' : 'light'}
              color={fitRunWidth && isRecording ? 'blue' : 'gray'}
              size="sm"
              aria-label="Fit to full run width"
              aria-pressed={fitRunWidth && isRecording}
              onClick={() => onFitRunWidthChange(!fitRunWidth)}
            >
              <IconMaximize size={16} stroke={2} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {isRecording ? (
          <Button
            size="compact-xs"
            variant={followLive ? 'filled' : 'light'}
            color={followLive ? 'blue' : 'gray'}
            onClick={() => onFollowLiveChange(!followLive)}
          >
            Live
          </Button>
        ) : null}

        <Text className={classes.viewHint}>
          Viewing {(viewSpan / 1000).toFixed(1)} s of {(dataSpan / 1000).toFixed(1)} s recorded
        </Text>
      </Group>

      <div
        className={classes.minimap}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerLeave={finishDrag}
      >
        <div
          ref={trackRef}
          className={classes.track}
          onClick={handleTrackClick}
          aria-hidden
        />

        <div
          className={`${classes.viewport} ${followLive && isRecording && !fitRunWidth ? classes.viewportLive : ''} ${fitRunWidth && isRecording ? classes.viewportFitRun : ''} ${dragMode === 'pan' ? classes.viewportDragging : ''}`}
          style={{
            left: `${startRatio * 100}%`,
            width: `${Math.max((endRatio - startRatio) * 100, 1.5)}%`,
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            setDragMode('pan')
            panAnchorRef.current = timeFromClientX(event.clientX)
          }}
        >
          <button
            type="button"
            aria-label="Adjust view start"
            className={classes.handleLeft}
            onPointerDown={(event) => {
              event.stopPropagation()
              event.currentTarget.setPointerCapture(event.pointerId)
              setDragMode('start')
            }}
          />
          <button
            type="button"
            aria-label="Adjust view end"
            className={classes.handleRight}
            onPointerDown={(event) => {
              event.stopPropagation()
              event.currentTarget.setPointerCapture(event.pointerId)
              setDragMode('end')
            }}
          />
        </div>
      </div>

      <Text className={classes.helpText}>
        Drag the highlighted range to scroll · Drag edges to zoom · Click the track to jump · 
        Live to follow the newest data · Fit to keep the full run in view while recording
      </Text>
    </StackLike>
  )
}

function StackLike({ children }: { children: React.ReactNode }) {
  return <div className={classes.stack}>{children}</div>
}
