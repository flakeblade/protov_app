import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMantineColorScheme, useMantineTheme } from '@mantine/core'
import type { MantineColor } from '@mantine/core'

import {
  computeStats,
  filterPointsByTimeRange,
  filterPointsByWindow,
  formatAxisTime,
  nearestPoint,
  resolveYAxis,
} from './utils'
import type { SelectionStats, TimeSeriesPoint, TimeWindow, YAxisRange } from './types'
import classes from './TimeSeriesChart.module.css'

const PLOT = { top: 36, right: 14, bottom: 28, left: 52 }

interface TimeSeriesChartProps {
  points: TimeSeriesPoint[]
  unit: string
  decimals: number
  color: MantineColor
  window: TimeWindow
  yAxis: YAxisRange
  fallbackY: { min: number; max: number }
  onSelectionChange: (stats: SelectionStats | null) => void
}

interface PlotPoint {
  x: number
  y: number
  t: number
  value: number
}

function buildPath(plotPoints: PlotPoint[]) {
  if (plotPoints.length === 0) return ''
  return plotPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

export function TimeSeriesChart({
  points,
  unit,
  decimals,
  color,
  window,
  yAxis,
  fallbackY,
  onSelectionChange,
}: TimeSeriesChartProps) {
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const svgRef = useRef<SVGSVGElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 640, height: 380 })
  const [hover, setHover] = useState<PlotPoint | null>(null)
  const [dragStart, setDragStart] = useState<PlotPoint | null>(null)
  const [dragEnd, setDragEnd] = useState<PlotPoint | null>(null)

  const visiblePoints = useMemo(() => filterPointsByWindow(points, window), [points, window])
  const yBounds = useMemo(
    () => resolveYAxis(visiblePoints, yAxis, fallbackY),
    [visiblePoints, yAxis, fallbackY],
  )

  const plotWidth = Math.max(size.width - PLOT.left - PLOT.right, 1)
  const plotHeight = Math.max(size.height - PLOT.top - PLOT.bottom, 1)
  const timeSpan = Math.max(window.end - window.start, 1)
  const valueSpan = Math.max(yBounds.max - yBounds.min, 1e-6)

  const plotPoints = useMemo<PlotPoint[]>(
    () =>
      visiblePoints.map((point) => ({
        t: point.t,
        value: point.value,
        x: PLOT.left + ((point.t - window.start) / timeSpan) * plotWidth,
        y: PLOT.top + (1 - (point.value - yBounds.min) / valueSpan) * plotHeight,
      })),
    [plotHeight, plotWidth, timeSpan, valueSpan, visiblePoints, window.start, yBounds.max, yBounds.min],
  )

  const lineColor = theme.colors[color][colorScheme === 'dark' ? 4 : 6]
  const path = useMemo(() => buildPath(plotPoints), [plotPoints])

  const yTicks = useMemo(() => {
    const count = 4
    return Array.from({ length: count + 1 }, (_, index) => {
      const ratio = index / count
      const value = yBounds.max - ratio * valueSpan
      const y = PLOT.top + ratio * plotHeight
      return { value, y }
    })
  }, [plotHeight, valueSpan, yBounds.max])

  const xTicks = useMemo(() => {
    const count = 4
    return Array.from({ length: count + 1 }, (_, index) => {
      const ratio = index / count
      const t = window.start + ratio * timeSpan
      const x = PLOT.left + ratio * plotWidth
      return { t, x }
    })
  }, [plotWidth, timeSpan, window.start])

  const clientToPlot = useCallback(
    (clientX: number, clientY: number): PlotPoint | null => {
      const svg = svgRef.current
      if (!svg) return null

      const rect = svg.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * size.width
      const y = ((clientY - rect.top) / rect.height) * size.height

      if (
        x < PLOT.left ||
        x > PLOT.left + plotWidth ||
        y < PLOT.top ||
        y > PLOT.top + plotHeight
      ) {
        return null
      }

      const t = window.start + ((x - PLOT.left) / plotWidth) * timeSpan
      const value = yBounds.max - ((y - PLOT.top) / plotHeight) * valueSpan
      return { x, y, t, value }
    },
    [plotHeight, plotWidth, size.height, size.width, timeSpan, valueSpan, window.start, yBounds.max],
  )

  const snapToSeries = useCallback(
    (plotPoint: PlotPoint | null) => {
      if (!plotPoint) return null
      const nearest = nearestPoint(visiblePoints, plotPoint.t)
      if (!nearest) return null

      return {
        t: nearest.t,
        value: nearest.value,
        x: PLOT.left + ((nearest.t - window.start) / timeSpan) * plotWidth,
        y: PLOT.top + (1 - (nearest.value - yBounds.min) / valueSpan) * plotHeight,
      }
    },
    [plotHeight, plotWidth, timeSpan, valueSpan, visiblePoints, window.start, yBounds.max, yBounds.min],
  )

  const updateSelection = useCallback(
    (start: PlotPoint | null, end: PlotPoint | null) => {
      if (!start || !end || Math.abs(end.x - start.x) < 4) {
        onSelectionChange(null)
        return
      }

      const selected = filterPointsByTimeRange(visiblePoints, start.t, end.t)
      const stats = computeStats(selected.map((point) => point.value))

      if (!stats) {
        onSelectionChange(null)
        return
      }

      onSelectionChange({
        ...stats,
        tStart: Math.min(start.t, end.t),
        tEnd: Math.max(start.t, end.t),
      })
    },
    [onSelectionChange, visiblePoints],
  )

  useEffect(() => {
    const node = chartRef.current
    if (!node) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width: Math.max(width, 1), height: Math.max(height, 1) })
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!dragStart) return

    const finishDrag = () => {
      updateSelection(dragStart, dragEnd)
      setDragStart(null)
      setDragEnd(null)
    }

    globalThis.addEventListener('mouseup', finishDrag)
    return () => globalThis.removeEventListener('mouseup', finishDrag)
  }, [dragEnd, dragStart, updateSelection])

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const plotPoint = snapToSeries(clientToPlot(event.clientX, event.clientY))
      setHover(plotPoint)
      if (dragStart) {
        setDragEnd(plotPoint)
      }
    },
    [clientToPlot, dragStart, snapToSeries],
  )

  return (
    <div ref={chartRef} className={classes.chart}>
      {hover && (
        <div className={classes.hoverReadout}>
          {formatAxisTime(hover.t, window.start)} · {hover.value.toFixed(decimals)} {unit}
        </div>
      )}

      <svg
        ref={svgRef}
        className={classes.svg}
        viewBox={`0 0 ${size.width} ${size.height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHover(null)
          if (!dragStart) return
        }}
        onMouseDown={(event) => {
          const plotPoint = snapToSeries(clientToPlot(event.clientX, event.clientY))
          setDragStart(plotPoint)
          setDragEnd(plotPoint)
          onSelectionChange(null)
        }}
        onMouseUp={() => {
          updateSelection(dragStart, dragEnd)
          setDragStart(null)
          setDragEnd(null)
        }}
      >
        {yTicks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={PLOT.left}
              x2={PLOT.left + plotWidth}
              y1={tick.y}
              y2={tick.y}
              stroke={colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]}
            />
            <text x={PLOT.left - 6} y={tick.y + 3} textAnchor="end" className={classes.axisLabel}>
              {tick.value.toFixed(decimals)}
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <text
            key={tick.t}
            x={tick.x}
            y={size.height - 8}
            textAnchor="middle"
            className={classes.axisLabel}
          >
            {formatAxisTime(tick.t, window.start)}
          </text>
        ))}

        <text
          x={PLOT.left - 8}
          y={PLOT.top - 12}
          textAnchor="end"
          className={classes.unitLabel}
        >
          {unit}
        </text>

        <path d={path} className={classes.seriesLine} stroke={lineColor} />

        {dragStart && dragEnd && (
          <rect
            className={classes.selectionRect}
            x={Math.min(dragStart.x, dragEnd.x)}
            y={PLOT.top}
            width={Math.abs(dragEnd.x - dragStart.x)}
            height={plotHeight}
          />
        )}

        {hover && (
          <>
            <line
              className={classes.crosshairLine}
              x1={hover.x}
              x2={hover.x}
              y1={PLOT.top}
              y2={PLOT.top + plotHeight}
            />
            <line
              className={classes.crosshairLine}
              x1={PLOT.left}
              x2={PLOT.left + plotWidth}
              y1={hover.y}
              y2={hover.y}
            />
          </>
        )}
      </svg>
    </div>
  )
}
