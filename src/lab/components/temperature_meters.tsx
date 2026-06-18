import { NumberFormatter, Progress, Stack, Text } from '@mantine/core'

import type { DeviceTemperatures } from '../telemetry/types'
import classes from './temperature_meters.module.css'

const TEMP_MAX_C = 85

interface TemperatureMetersProps {
  temperatures: DeviceTemperatures
  compact?: boolean
}

interface MeterProps {
  label: string
  value: number
  compact?: boolean
}

function tempColor(value: number) {
  if (value >= 60) return 'red'
  if (value >= 45) return 'yellow'
  return 'blue'
}

function TemperatureMeter({ label, value, compact }: MeterProps) {
  const percent = Math.min(100, Math.max(0, (value / TEMP_MAX_C) * 100))

  return (
    <div className={classes.meter}>
      <div className={classes.meterHeader}>
        <Text size={compact ? 'xs' : 'sm'} fw={500}>
          {label}
        </Text>
        <Text className={compact ? classes.readingCompact : classes.reading}>
          <NumberFormatter value={value} decimalScale={1} fixedDecimalScale />
          {' °C'}
        </Text>
      </div>
      <Progress
        value={percent}
        color={tempColor(value)}
        size={compact ? 'xs' : 'sm'}
        radius="sm"
      />
    </div>
  )
}

export function TemperatureMeters({ temperatures, compact = false }: TemperatureMetersProps) {
  return (
    <Stack gap={compact ? 4 : 'sm'}>
      <Text className={classes.sectionLabel} c="dimmed">
        TEMPERATURE
      </Text>
      <Stack gap={compact ? 4 : 'sm'}>
        <TemperatureMeter label="Ch A" value={temperatures.chA} compact={compact} />
        <TemperatureMeter label="Ch B" value={temperatures.chB} compact={compact} />
        <TemperatureMeter label="MCU" value={temperatures.mcu} compact={compact} />
      </Stack>
    </Stack>
  )
}
