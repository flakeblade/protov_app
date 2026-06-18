import { useMemo, useState } from 'react'
import type { MantineColor } from '@mantine/core'
import {
  Badge,
  Button,
  Card,
  Group,
  NumberFormatter,
  NumberInput,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  useMantineTheme,
} from '@mantine/core'
import { IconBolt, IconDownload } from '@tabler/icons-react'

import type { Channel } from '../components/channel_chip'
import { TimeRangeScroller } from './TimeRangeScroller'
import { TimeSeriesChart } from './TimeSeriesChart'
import { METRIC_CONFIG, type GraphMetric, type SelectionStats, type TimeSeriesBuffer } from './types'
import { downloadWindowCsv, filterPointsByWindow } from './utils'
import classes from './ChannelGraphCard.module.css'

const DEFAULT_WINDOW_MS = 60_000

interface ChannelGraphCardProps extends Channel {
  series: Record<GraphMetric, TimeSeriesBuffer>
  voltageSetpoint: number
  currentSetpoint: number
}

export function ChannelGraphCard({
  identifier,
  color,
  active,
  series,
  voltageSetpoint,
  currentSetpoint,
}: ChannelGraphCardProps) {
  const theme = useMantineTheme()
  const borderColor = theme.colors[color as MantineColor][5]
  const [outputEnabled, setOutputEnabled] = useState(active)
  const [metric, setMetric] = useState<GraphMetric>('voltage')
  const [yMin, setYMin] = useState<number | string>('')
  const [yMax, setYMax] = useState<number | string>('')
  const [selection, setSelection] = useState<SelectionStats | null>(null)

  const metricConfig = METRIC_CONFIG[metric]
  const allPoints = series[metric].points

  const dataExtent = useMemo(() => {
    if (allPoints.length === 0) {
      const now = Date.now()
      return { start: now - DEFAULT_WINDOW_MS, end: now }
    }

    return {
      start: allPoints[0].t,
      end: allPoints[allPoints.length - 1].t,
    }
  }, [allPoints])

  const [window, setWindow] = useState(() => ({
    start: dataExtent.end - DEFAULT_WINDOW_MS,
    end: dataExtent.end,
  }))

  const parsedYMin = yMin === '' ? null : Number(yMin)
  const parsedYMax = yMax === '' ? null : Number(yMax)

  const windowSeries = useMemo(
    () => ({
      voltage: series.voltage.points,
      current: series.current.points,
      power: series.power.points,
    }),
    [series],
  )

  const windowSampleCount = useMemo(
    () => filterPointsByWindow(series.voltage.points, window).length,
    [series.voltage.points, window],
  )

  const windowDurationSec = (window.end - window.start) / 1000

  const windowStartOffsetSec = (window.start - dataExtent.start) / 1000
  const windowEndOffsetSec = (window.end - dataExtent.start) / 1000
  const dataSpanSec = (dataExtent.end - dataExtent.start) / 1000

  const handleDownload = () => {
    downloadWindowCsv(`channel-${identifier}-window.csv`, windowSeries, window)
  }

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderColor,
      }}
    >
      <Group justify="space-between" className={classes.cardHeader}>
        <Group gap="md" wrap="nowrap">
          <Badge color={color} size="md">
            {`Channel ${identifier}`}
          </Badge>

          <Text className={classes.setpoints}>
            <NumberFormatter value={voltageSetpoint} decimalScale={3} fixedDecimalScale />
            {' V · '}
            <NumberFormatter value={currentSetpoint} decimalScale={3} fixedDecimalScale />
            {' A'}
          </Text>
        </Group>

        <Switch
          size="md"
          color={color}
          checked={outputEnabled}
          onChange={(event) => setOutputEnabled(event.currentTarget.checked)}
          onLabel={<IconBolt size={16} stroke={2.5} />}
        />
      </Group>

      <SegmentedControl
        className={classes.metricControl}
        value={metric}
        onChange={(value) => {
          setMetric(value as GraphMetric)
          setSelection(null)
        }}
        data={[
          { label: 'Voltage (V)', value: 'voltage' },
          { label: 'Current (A)', value: 'current' },
          { label: 'Power (W)', value: 'power' },
        ]}
        fullWidth
        size="xs"
      />

      <div className={classes.axisRow}>
        <Stack gap={2}>
          <Text className={classes.axisLabel}>Y min ({metricConfig.unit})</Text>
          <NumberInput
            value={yMin}
            onChange={setYMin}
            placeholder="Auto"
            decimalScale={metricConfig.decimals}
            suffix={metricConfig.unit}
            size="xs"
          />
        </Stack>
        <Stack gap={2}>
          <Text className={classes.axisLabel}>Y max ({metricConfig.unit})</Text>
          <NumberInput
            value={yMax}
            onChange={setYMax}
            placeholder="Auto"
            decimalScale={metricConfig.decimals}
            suffix={metricConfig.unit}
            size="xs"
          />
        </Stack>
        <Stack gap={2}>
          <Text className={classes.axisLabel}>T start (s)</Text>
          <NumberInput
            value={windowStartOffsetSec}
            onChange={(value) => {
              const next = dataExtent.start + Number(value) * 1000
              setWindow((current) => ({
                start: Math.min(next, current.end - 1000),
                end: current.end,
              }))
            }}
            min={0}
            max={dataSpanSec}
            decimalScale={1}
            suffix="s"
            size="xs"
          />
        </Stack>
        <Stack gap={2}>
          <Text className={classes.axisLabel}>T end (s)</Text>
          <NumberInput
            value={windowEndOffsetSec}
            onChange={(value) => {
              const next = dataExtent.start + Number(value) * 1000
              setWindow((current) => ({
                start: current.start,
                end: Math.max(next, current.start + 1000),
              }))
            }}
            min={0}
            max={dataSpanSec}
            decimalScale={1}
            suffix="s"
            size="xs"
          />
        </Stack>
      </div>

      <TimeSeriesChart
        points={allPoints}
        unit={metricConfig.unit}
        decimals={metricConfig.decimals}
        color={color as MantineColor}
        window={window}
        yAxis={{ min: parsedYMin, max: parsedYMax }}
        fallbackY={{
          min: metricConfig.defaultMin,
          max: metricConfig.defaultMax,
        }}
        onSelectionChange={setSelection}
      />

      <TimeRangeScroller
        dataStart={dataExtent.start}
        dataEnd={dataExtent.end}
        window={window}
        onWindowChange={setWindow}
      />

      <div className={classes.statsRow}>
        {selection ? (
          <>
            <span>
              μ = {selection.mean.toFixed(metricConfig.decimals)} {metricConfig.unit}
            </span>
            <span>
              σ = {selection.stddev.toFixed(metricConfig.decimals)} {metricConfig.unit}
            </span>
            <span>n = {selection.n}</span>
          </>
        ) : (
          <span>Drag across the plot to compute mean, σ, and sample count.</span>
        )}
      </div>

      <div className={classes.footerRow}>
        <Text className={classes.timeHint}>
          Visible window: {windowDurationSec.toFixed(1)} s · {windowSampleCount} samples
        </Text>
        <Button
          size="xs"
          variant="light"
          color="gray"
          leftSection={<IconDownload size={14} />}
          onClick={handleDownload}
        >
          Download window (V, A, W)
        </Button>
      </div>
    </Card>
  )
}
