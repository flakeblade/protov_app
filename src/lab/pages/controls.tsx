import { useMemo, useState } from 'react'
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
import { CURRENT_MAX, CURRENT_MIN, VOLTAGE_MAX, VOLTAGE_MIN } from '../devices/device_io'
import { useLabView } from '../lab_view'
import classes from './controls.module.css'

const DECIMALS = 3

type SetpointKey = 'voltage' | 'current' | 'ovp' | 'ocp'

interface ChannelSetpoints {
  voltage: number
  current: number
  ovp: number
  ocp: number
}

type SetpointTextDraft = Record<SetpointKey, string>

function channelSetpoints(channel: Channel): ChannelSetpoints {
  return {
    voltage: channel.voltageSet,
    current: channel.currentSet,
    ovp: channel.ovp,
    ocp: channel.ocp,
  }
}

function formatSetpoint(value: number): string {
  return value.toFixed(DECIMALS)
}

function formatSetpointDraft(setpoints: ChannelSetpoints): SetpointTextDraft {
  return {
    voltage: formatSetpoint(setpoints.voltage),
    current: formatSetpoint(setpoints.current),
    ovp: formatSetpoint(setpoints.ovp),
    ocp: formatSetpoint(setpoints.ocp),
  }
}

function parseSetpoint(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const value = Number.parseFloat(trimmed)
  if (Number.isNaN(value)) return null
  return Math.round(value * 10 ** DECIMALS) / 10 ** DECIMALS
}

function draftTextDirty(text: string, committed: number): boolean {
  const trimmed = text.trim()
  const roundedCommitted = Math.round(committed * 10 ** DECIMALS) / 10 ** DECIMALS
  if (!trimmed) return roundedCommitted !== 0
  const parsed = parseSetpoint(trimmed)
  if (parsed === null) return true
  return parsed !== roundedCommitted
}

function draftDirty(draft: SetpointTextDraft, committed: ChannelSetpoints): boolean {
  return (
    draftTextDirty(draft.voltage, committed.voltage) ||
    draftTextDirty(draft.current, committed.current) ||
    draftTextDirty(draft.ovp, committed.ovp) ||
    draftTextDirty(draft.ocp, committed.ocp)
  )
}

function setpointInRange(text: string, min: number, max: number): boolean {
  const parsed = parseSetpoint(text)
  if (parsed === null) return false
  return parsed >= min && parsed <= max
}

function draftInRange(draft: SetpointTextDraft): boolean {
  return (
    setpointInRange(draft.voltage, VOLTAGE_MIN, VOLTAGE_MAX) &&
    setpointInRange(draft.current, CURRENT_MIN, CURRENT_MAX) &&
    setpointInRange(draft.ovp, VOLTAGE_MIN, VOLTAGE_MAX) &&
    setpointInRange(draft.ocp, CURRENT_MIN, CURRENT_MAX)
  )
}

function parseDraft(draft: SetpointTextDraft): ChannelSetpoints | null {
  const voltage = parseSetpoint(draft.voltage)
  const current = parseSetpoint(draft.current)
  const ovp = parseSetpoint(draft.ovp)
  const ocp = parseSetpoint(draft.ocp)
  if (voltage === null || current === null || ovp === null || ocp === null) return null
  if (!draftInRange(draft)) return null
  return {
    voltage: Math.min(VOLTAGE_MAX, Math.max(VOLTAGE_MIN, voltage)),
    current: Math.min(CURRENT_MAX, Math.max(CURRENT_MIN, current)),
    ovp: Math.min(VOLTAGE_MAX, Math.max(VOLTAGE_MIN, ovp)),
    ocp: Math.min(CURRENT_MAX, Math.max(CURRENT_MIN, ocp)),
  }
}

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
            onApplySetpoints={async (changes) => {
              for (const [param, value] of Object.entries(changes) as [SetpointParam, number][]) {
                await updateChannelSetpoint(deviceId, channel.identifier, param, value)
              }
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
  text: string
  committed: number
  min: number
  max: number
  placeholder: string
  tooltip: string
  editing: boolean
  onTextChange: (text: string) => void
}

function LimitField({
  label,
  unit,
  text,
  committed,
  min,
  max,
  placeholder,
  tooltip,
  editing,
  onTextChange,
}: LimitFieldProps) {
  const outOfRange = !setpointInRange(text, min, max)
  const dirty = editing && draftTextDirty(text, committed) && !outOfRange

  const handleBlur = () => {
    const parsed = parseSetpoint(text)
    if (parsed === null) return
    const clamped = Math.min(max, Math.max(min, parsed))
    onTextChange(formatSetpoint(clamped))
  }

  const inputClassName = [
    classes.limitInputField,
    outOfRange ? classes.limitInputError : dirty ? classes.limitInputDirty : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tooltip label={tooltip}>
      <div className={classes.limitField}>
        <Text className={classes.limitLabel}>{label}</Text>
        <NumberInput
          key={editing ? label : `${label}-${formatSetpoint(committed)}`}
          className={classes.limitInput}
          classNames={{ input: inputClassName }}
          value={text}
          onChange={(next) => onTextChange(String(next ?? ''))}
          onBlur={handleBlur}
          placeholder={placeholder}
          suffix={unit}
          decimalScale={DECIMALS}
          hideControls
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
  unit: string
  min: number
  max: number
  setTooltip: string
  protectionLabel?: 'OVP' | 'OCP'
  setText: string
  protectionText?: string
  committedSet: number
  committedProtection?: number
  protectionTooltip?: string
  showProtection?: boolean
  editing: boolean
  onSetTextChange: (text: string) => void
  onProtectionTextChange?: (text: string) => void
}

function ParameterRow({
  label,
  liveValue,
  unit,
  min,
  max,
  setTooltip,
  protectionLabel,
  setText,
  protectionText = '',
  committedSet,
  committedProtection = 0,
  protectionTooltip,
  showProtection = true,
  editing,
  onSetTextChange,
  onProtectionTextChange,
}: ParameterRowProps) {
  const placeholder = `${formatSetpoint(min)}–${formatSetpoint(max)}`

  return (
    <div className={classes.parameterRow}>
      <Text className={classes.rowLabel}>{label}</Text>
      <ReadingValue value={liveValue} unit={unit} />
      <div className={showProtection ? classes.limitStack : classes.limitStackSingle}>
        <LimitField
          label="SET"
          unit={unit}
          text={setText}
          committed={committedSet}
          min={min}
          max={max}
          placeholder={placeholder}
          tooltip={setTooltip}
          editing={editing}
          onTextChange={onSetTextChange}
        />
        {showProtection && protectionLabel && protectionTooltip && onProtectionTextChange && (
          <LimitField
            label={protectionLabel}
            unit={unit}
            text={protectionText}
            committed={committedProtection}
            min={min}
            max={max}
            placeholder={placeholder}
            tooltip={protectionTooltip}
            editing={editing}
            onTextChange={onProtectionTextChange}
          />
        )}
      </div>
    </div>
  )
}

interface ChannelCardProps {
  channel: Channel
  onToggleOutput: () => void
  onApplySetpoints: (changes: Partial<Record<SetpointParam, number>>) => Promise<void>
  onColorChange: (color: ChannelColor) => void
}

function ChannelCard({
  channel,
  onToggleOutput,
  onApplySetpoints,
  onColorChange,
}: ChannelCardProps) {
  const theme = useMantineTheme()
  const { isEngineering } = useLabView()
  const mode: ChannelHardwareMode = channel.mode
  const modeIsFault = isChannelFaultMode(mode)
  const borderColor = theme.colors[channel.color as MantineColor]?.[5] ?? theme.colors.gray[5]
  const livePower = channel.measuredVoltage * channel.measuredCurrent

  const committed = useMemo(
    () => channelSetpoints(channel),
    [channel.voltageSet, channel.currentSet, channel.ovp, channel.ocp],
  )
  const committedDraft = useMemo(() => formatSetpointDraft(committed), [committed])
  const [userDraft, setUserDraft] = useState<SetpointTextDraft | null>(null)
  const [applying, setApplying] = useState(false)

  const hasDraft = userDraft !== null && draftDirty(userDraft, committed)
  const draftText = hasDraft ? userDraft : committedDraft
  const parsedDraft = hasDraft ? parseDraft(draftText) : null
  const canApply = hasDraft && parsedDraft !== null && draftInRange(draftText)

  const updateDraftText = (key: SetpointKey, text: string) => {
    setUserDraft((previous) => {
      const next = { ...(previous ?? committedDraft), [key]: text }
      return draftDirty(next, committed) ? next : null
    })
  }

  const handleApply = async () => {
    if (!canApply || applying || !parsedDraft) return

    const changes: Partial<Record<SetpointParam, number>> = {}
    if (parsedDraft.voltage !== committed.voltage) changes.voltage = parsedDraft.voltage
    if (parsedDraft.current !== committed.current) changes.current = parsedDraft.current
    if (parsedDraft.ovp !== committed.ovp) changes.ovp = parsedDraft.ovp
    if (parsedDraft.ocp !== committed.ocp) changes.ocp = parsedDraft.ocp
    if (Object.keys(changes).length === 0) return

    setApplying(true)
    try {
      await onApplySetpoints(changes)
      setUserDraft(null)
    } finally {
      setApplying(false)
    }
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

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void handleApply()
        }}
      >
        <Stack gap="xs">
          <ParameterRow
            label="Voltage"
            liveValue={channel.measuredVoltage}
            unit="V"
            min={VOLTAGE_MIN}
            max={VOLTAGE_MAX}
            setTooltip={`Target voltage on output (${formatSetpoint(VOLTAGE_MIN)}–${formatSetpoint(VOLTAGE_MAX)} V)`}
            protectionLabel="OVP"
            setText={draftText.voltage}
            protectionText={draftText.ovp}
            committedSet={committed.voltage}
            committedProtection={committed.ovp}
            protectionTooltip={`Over-voltage protection limit (${formatSetpoint(VOLTAGE_MIN)}–${formatSetpoint(VOLTAGE_MAX)} V)`}
            showProtection={isEngineering}
            editing={hasDraft}
            onSetTextChange={(text) => updateDraftText('voltage', text)}
            onProtectionTextChange={(text) => updateDraftText('ovp', text)}
          />

          <ParameterRow
            label="Current"
            liveValue={channel.measuredCurrent}
            unit="A"
            min={CURRENT_MIN}
            max={CURRENT_MAX}
            setTooltip={`Target current on output (${formatSetpoint(CURRENT_MIN)}–${formatSetpoint(CURRENT_MAX)} A)`}
            protectionLabel="OCP"
            setText={draftText.current}
            protectionText={draftText.ocp}
            committedSet={committed.current}
            committedProtection={committed.ocp}
            protectionTooltip={`Over-current protection limit (${formatSetpoint(CURRENT_MIN)}–${formatSetpoint(CURRENT_MAX)} A)`}
            showProtection={isEngineering}
            editing={hasDraft}
            onSetTextChange={(text) => updateDraftText('current', text)}
            onProtectionTextChange={(text) => updateDraftText('ocp', text)}
          />

          <div className={classes.powerRow}>
            <Text className={classes.rowLabel}>Power</Text>
            <ReadingValue value={livePower} unit="W" />
            <Button
              className={classes.applyButton}
              variant="light"
              color={channel.color}
              size="sm"
              disabled={!canApply}
              loading={applying}
              type="submit"
            >
              Apply
            </Button>
          </div>
        </Stack>
      </form>
    </Card>
  )
}
