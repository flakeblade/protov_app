import { useEffect, useState } from 'react'
import type { MantineColor } from '@mantine/core'
import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  NumberFormatter,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Tooltip,
  useMantineTheme,
} from '@mantine/core'
import { IconAdjustments, IconBolt } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

import type { Channel } from '../components/channel_chip'
import { ChannelColorPicker } from '../components/channel_color_picker'
import type { ChannelColor } from '../devices/channel-colors'
import {
  isChannelFaultMode,
  MODE_TOOLTIPS,
  type ChannelHardwareMode,
} from '../devices/channel-mode'
import { useDeviceStore } from '../devices/device_store'
import type { SetpointParam } from '../devices/device_io'
import { CURRENT_MAX, VOLTAGE_MAX } from '../devices/device_io'
import { useLabView } from '../lab_view'
import classes from './controls.module.css'

const DECIMALS = 3

export function ControlsPage() {
  const navigate = useNavigate()
  const { devices, toggleChannelOutput, updateChannelSetpoint, updateChannelColor } = useDeviceStore()

  const channels = devices.flatMap((device) =>
    device.channels.map((channel) => ({ deviceId: device.id, channel })),
  )

  if (channels.length === 0) {
    return (
      <Container size="sm">
        <Stack align="center" gap="md" py="xl">
          <IconAdjustments size={40} stroke={1.5} />
          <Stack align="center" gap={4}>
            <Text fw={600}>No devices connected</Text>
            <Text size="sm" c="dimmed" ta="center">
              Connect a ProtoV MINI on the Devices page to adjust channel setpoints and outputs
              here.
            </Text>
          </Stack>
          <Button
            leftSection={<IconBolt size={16} />}
            onClick={() => {
              navigate('/lab/devices')
            }}
          >
            Go to Devices
          </Button>
        </Stack>
      </Container>
    )
  }

  return (
    <Container>
      <SimpleGrid
        type="container"
        cols={{ base: 1, '300px': 1, '850px': 2 }}
        spacing={{ base: 'md' }}
      >
        {channels.map(({ deviceId, channel }) => (
          <ChannelCard
            key={`${deviceId}-${channel.identifier}`}
            channel={channel}
            onToggleOutput={() => {
              void toggleChannelOutput(deviceId, channel.identifier)
            }}
            onSetpointChange={(param, value) => {
              void updateChannelSetpoint(deviceId, channel.identifier, param, value)
            }}
            onColorChange={(color) => {
              void updateChannelColor(deviceId, channel.identifier, color)
            }}
          />
        ))}
      </SimpleGrid>
    </Container>
  )
}

interface ReadingValueProps {
  value: number
  unit: string
}

function ReadingValue({ value, unit }: ReadingValueProps) {
  const offset = 10 ** -(DECIMALS + 1)

  return (
    <Paper className={classes.readingBox} withBorder radius="sm">
      <span className={classes.readingValue}>
        <NumberFormatter value={value + offset} decimalScale={DECIMALS} fixedDecimalScale />
      </span>
      <span className={classes.readingUnit}>{unit}</span>
    </Paper>
  )
}

interface LimitFieldProps {
  label: string
  unit: string
  value: number
  min: number
  max: number
  placeholder: string
  tooltip: string
  onCommit: (value: number) => void
}

function LimitField({
  label,
  unit,
  value,
  min,
  max,
  placeholder,
  tooltip,
  onCommit,
}: LimitFieldProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const commit = () => {
    if (draft === null || Number.isNaN(draft)) {
      setDraft(value)
      return
    }
    const clamped = Math.min(max, Math.max(min, draft))
    setDraft(clamped)
    if (clamped !== value) {
      onCommit(clamped)
    }
  }

  return (
    <Tooltip label={tooltip}>
      <div className={classes.limitField}>
        <Text className={classes.limitLabel}>{label}</Text>
        <NumberInput
          className={classes.limitInput}
          classNames={{ input: classes.limitInputField }}
          value={draft}
          onChange={(next) => setDraft(typeof next === 'number' ? next : 0)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
          placeholder={placeholder}
          suffix={unit}
          decimalScale={DECIMALS}
          fixedDecimalScale
          min={min}
          max={max}
          size="xs"
        />
      </div>
    </Tooltip>
  )
}

interface ParameterRowProps {
  label: string
  liveValue: number
  setValue: number
  unit: string
  min: number
  max: number
  setTooltip: string
  protectionLabel?: 'OVP' | 'OCP'
  protectionValue?: number
  protectionTooltip?: string
  showProtection?: boolean
  onSetCommit: (value: number) => void
  onProtectionCommit?: (value: number) => void
}

function ParameterRow({
  label,
  liveValue,
  setValue,
  unit,
  min,
  max,
  setTooltip,
  protectionLabel,
  protectionValue = 0,
  protectionTooltip,
  showProtection = true,
  onSetCommit,
  onProtectionCommit,
}: ParameterRowProps) {
  const placeholder = `0.${'0'.repeat(DECIMALS)}–${max}.${'0'.repeat(DECIMALS)}`

  return (
    <div className={classes.parameterRow}>
      <Text className={classes.rowLabel}>{label}</Text>
      <ReadingValue value={liveValue} unit={unit} />
      <div className={showProtection ? classes.limitStack : classes.limitStackSingle}>
        <LimitField
          label="SET"
          unit={unit}
          value={setValue}
          min={min}
          max={max}
          placeholder={placeholder}
          tooltip={setTooltip}
          onCommit={onSetCommit}
        />
        {showProtection && protectionLabel && protectionTooltip && onProtectionCommit && (
          <LimitField
            label={protectionLabel}
            unit={unit}
            value={protectionValue}
            min={min}
            max={max}
            placeholder={placeholder}
            tooltip={protectionTooltip}
            onCommit={onProtectionCommit}
          />
        )}
      </div>
    </div>
  )
}

interface ChannelCardProps {
  channel: Channel
  onToggleOutput: () => void
  onSetpointChange: (param: SetpointParam, value: number) => void
  onColorChange: (color: ChannelColor) => void
}

function ChannelCard({
  channel,
  onToggleOutput,
  onSetpointChange,
  onColorChange,
}: ChannelCardProps) {
  const theme = useMantineTheme()
  const { isEngineering } = useLabView()
  const mode: ChannelHardwareMode = channel.mode
  const modeIsFault = isChannelFaultMode(mode)
  const borderColor = theme.colors[channel.color as MantineColor]?.[5] ?? theme.colors.gray[5]
  const livePower = channel.measuredVoltage * channel.measuredCurrent

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
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Badge color={channel.color} size="md">
            {`Channel ${channel.identifier}`}
          </Badge>
          <ChannelColorPicker color={channel.color} onChange={onColorChange} />
        </Group>

        <Group gap="sm">
          <Tooltip label={MODE_TOOLTIPS[mode]}>
            <Text
              component="span"
              className={`${classes.modeTag} ${modeIsFault ? classes.modeTagFault : ''}`}
            >
              {mode}
            </Text>
          </Tooltip>

          <Switch
            size="md"
            color={channel.color}
            checked={channel.active}
            onChange={onToggleOutput}
            onLabel={<IconBolt size={16} stroke={2.5} />}
            aria-label={`Toggle output for channel ${channel.identifier}`}
          />
        </Group>
      </Group>

      <Stack gap="xs">
        <ParameterRow
          label="Voltage"
          liveValue={channel.measuredVoltage}
          setValue={channel.voltageSet}
          unit="V"
          min={0}
          max={VOLTAGE_MAX}
          setTooltip="Target voltage on output"
          protectionLabel="OVP"
          protectionValue={channel.ovp}
          protectionTooltip="Over-voltage protection limit"
          showProtection={isEngineering}
          onSetCommit={(value) => onSetpointChange('voltage', value)}
          onProtectionCommit={(value) => onSetpointChange('ovp', value)}
        />

        <ParameterRow
          label="Current"
          liveValue={channel.measuredCurrent}
          setValue={channel.currentSet}
          unit="A"
          min={0}
          max={CURRENT_MAX}
          setTooltip="Target current on output"
          protectionLabel="OCP"
          protectionValue={channel.ocp}
          protectionTooltip="Over-current protection limit"
          showProtection={isEngineering}
          onSetCommit={(value) => onSetpointChange('current', value)}
          onProtectionCommit={(value) => onSetpointChange('ocp', value)}
        />

        <div className={classes.powerRow}>
          <Text className={classes.rowLabel}>Power</Text>
          <ReadingValue value={livePower} unit="W" />
        </div>
      </Stack>
    </Card>
  )
}
