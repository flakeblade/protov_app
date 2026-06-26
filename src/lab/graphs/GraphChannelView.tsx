import { memo, useCallback, useMemo, useState } from 'react'
import type { MantineColor } from '@mantine/core'
import {
  Badge,
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
import { IconBolt } from '@tabler/icons-react'

import type { Channel } from '../components/channel_chip'
import { TimeSeriesChart } from './TimeSeriesChart'
import { METRIC_CONFIG, type GraphMetric, type SelectionStats, type TimeSeriesBuffer } from './types'
import type { TimeWindow } from './types'
import classes from './ChannelGraphCard.module.css'

interface GraphChannelHeaderProps {
  identifier: string
  color: MantineColor
  active: boolean
  voltageSet: number
  currentSet: number
  onToggleOutput: () => void
}

const GraphChannelHeader = memo(function GraphChannelHeader({
  identifier,
  color,
  active,
  voltageSet,
  currentSet,
  onToggleOutput,
}: GraphChannelHeaderProps) {
  return (
    <Group justify="space-between" className={classes.cardHeader}>
      <Group gap="md" wrap="nowrap">
        <Badge color={color} size="md">
          {`Channel ${identifier}`}
        </Badge>
        <Text className={classes.setpoints}>
          <NumberFormatter value={voltageSet} decimalScale={3} fixedDecimalScale />
          {' V · '}
          <NumberFormatter value={currentSet} decimalScale={3} fixedDecimalScale />
          {' A'}
        </Text>
      </Group>

      <Switch
        size="md"
        color={color}
        checked={active}
        onChange={onToggleOutput}
        onLabel={<IconBolt size={16} stroke={2.5} />}
        aria-label={`Toggle output for channel ${identifier}`}
      />
    </Group>
  )
})

interface GraphChannelPlotProps {
  color: MantineColor
  voltageSet: number
  currentSet: number
  series: Record<GraphMetric, TimeSeriesBuffer>
  window: TimeWindow
  chartRevision: number
}

const GraphChannelPlot = memo(function GraphChannelPlot({
  color,
  voltageSet,
  currentSet,
  series,
  window,
  chartRevision,
}: GraphChannelPlotProps) {
  const [metric, setMetric] = useState<GraphMetric>('voltage')
  const [yMin, setYMin] = useState<number | string>('')
  const [yMax, setYMax] = useState<number | string>('')
  const [selection, setSelection] = useState<SelectionStats | null>(null)

  const metricConfig = METRIC_CONFIG[metric]
  const activeSetpoint =
    metric === 'voltage' ? voltageSet : metric === 'current' ? currentSet : voltageSet * currentSet
  const parsedYMin = yMin === '' ? null : Number(yMin)
  const parsedYMax = yMax === '' ? null : Number(yMax)

  const points = useMemo(() => {
    return series[metric].points
    // eslint-disable-next-line react-hooks/exhaustive-deps -- in-place buffer; revision triggers refresh
  }, [chartRevision, metric, series])

  const handleSelectionChange = useCallback((stats: SelectionStats | null) => {
    setSelection(stats)
  }, [])

  return (
    <>
      <SegmentedControl
        className={classes.metricControl}
        value={metric}
        onChange={(value) => setMetric(value as GraphMetric)}
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
      </div>

      <TimeSeriesChart
        dataRevision={chartRevision}
        points={points}
        unit={metricConfig.unit}
        decimals={metricConfig.decimals}
        color={color}
        window={window}
        yAxis={{ min: parsedYMin, max: parsedYMax }}
        fallbackY={{
          min: metricConfig.defaultMin,
          max: metricConfig.defaultMax,
        }}
        setpoint={activeSetpoint}
        onSelectionChange={handleSelectionChange}
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
    </>
  )
})

interface GraphChannelViewProps {
  channel: Channel
  series: Record<GraphMetric, TimeSeriesBuffer>
  window: TimeWindow
  chartRevision: number
  onToggleOutput: () => void
}

export const GraphChannelView = memo(function GraphChannelView({
  channel,
  series,
  window,
  chartRevision,
  onToggleOutput,
}: GraphChannelViewProps) {
  const theme = useMantineTheme()
  const borderColor = theme.colors[channel.color as MantineColor]?.[5] ?? theme.colors.gray[5]

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderColor,
      }}
    >
      <GraphChannelHeader
        identifier={channel.identifier}
        color={channel.color as MantineColor}
        active={channel.active}
        voltageSet={channel.voltageSet}
        currentSet={channel.currentSet}
        onToggleOutput={onToggleOutput}
      />

      <GraphChannelPlot
        color={channel.color as MantineColor}
        voltageSet={channel.voltageSet}
        currentSet={channel.currentSet}
        series={series}
        window={window}
        chartRevision={chartRevision}
      />
    </Card>
  )
})
