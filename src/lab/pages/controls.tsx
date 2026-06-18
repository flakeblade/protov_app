import type { MantineColor } from '@mantine/core'
import {
  Badge,
  Card,
  Container,
  Group,
  NumberFormatter,
  NumberInput,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
  Tooltip,
  useMantineTheme,
} from '@mantine/core'
import { IconBolt } from '@tabler/icons-react'

import classes from './controls.module.css'
import type { Channel } from '../components/channel_chip'

const VOLTAGE_MAX = 20
const CURRENT_MAX = 5
const DECIMALS = 3

type RegulationMode = 'CV' | 'CC'

interface ChannelCardData extends Channel {
  regulationMode?: RegulationMode
}

export function ControlsPage() {
  return (
    <Container>
      <SimpleGrid
        type="container"
        cols={{ base: 1, '300px': 1, '850px': 2 }}
        spacing={{ base: 'md' }}
      >
        <Skeleton radius="md" visible={false} animate={false}>
          <ChannelCard
            identifier="A"
            color="red"
            voltage={20.3}
            current={0.5}
            active={true}
            regulationMode="CV"
          />
        </Skeleton>

        <Skeleton radius="md" visible={false} animate={false}>
          <ChannelCard
            identifier="B"
            color="blue"
            voltage={1.8}
            current={0.1}
            active={true}
            regulationMode="CC"
          />
        </Skeleton>

        <Skeleton radius="md" visible={false} animate={false}>
          <ChannelCard
            identifier="C"
            color="yellow"
            voltage={1.8}
            current={0.1}
            active={true}
            regulationMode="CV"
          />
        </Skeleton>

        <Skeleton radius="md" visible={false} animate={false}>
          <ChannelCard
            identifier="D"
            color="green"
            voltage={1.8}
            current={0.1}
            active={true}
            regulationMode="CC"
          />
        </Skeleton>

        <Skeleton radius="md" animate />
        <Skeleton radius="md" animate />
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
        <NumberFormatter
          value={value + offset}
          decimalScale={DECIMALS}
          fixedDecimalScale
        />
      </span>
      <span className={classes.readingUnit}>{unit}</span>
    </Paper>
  )
}

interface LimitFieldProps {
  label: string
  unit: string
  min: number
  max: number
  placeholder: string
  tooltip: string
}

function LimitField({ label, unit, min, max, placeholder, tooltip }: LimitFieldProps) {
  return (
    <Tooltip label={tooltip}>
      <div className={classes.limitField}>
        <Text className={classes.limitLabel}>{label}</Text>
        <NumberInput
          className={classes.limitInput}
          classNames={{ input: classes.limitInputField }}
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
  value: number
  unit: string
  min: number
  max: number
  setTooltip: string
  protectionLabel: 'OVP' | 'OCP'
  protectionTooltip: string
}

function ParameterRow({
  label,
  value,
  unit,
  min,
  max,
  setTooltip,
  protectionLabel,
  protectionTooltip,
}: ParameterRowProps) {
  const placeholder = `0.${'0'.repeat(DECIMALS)}–${max}.${'0'.repeat(DECIMALS)}`

  return (
    <div className={classes.parameterRow}>
      <Text className={classes.rowLabel}>{label}</Text>
      <ReadingValue value={value} unit={unit} />
      <div className={classes.limitStack}>
        <LimitField
          label="SET"
          unit={unit}
          min={min}
          max={max}
          placeholder={placeholder}
          tooltip={setTooltip}
        />
        <LimitField
          label={protectionLabel}
          unit={unit}
          min={min}
          max={max}
          placeholder={placeholder}
          tooltip={protectionTooltip}
        />
      </div>
    </div>
  )
}

const REGULATION_TOOLTIPS: Record<RegulationMode, string> = {
  CV: 'Constant voltage — output holds target voltage',
  CC: 'Constant current — output holds target current',
}

function ChannelCard({
  identifier,
  color,
  voltage,
  current,
  regulationMode = 'CV',
}: ChannelCardData) {
  const theme = useMantineTheme()
  const borderColor = theme.colors[color as MantineColor][5]

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
        <Badge color={color} size="md">
          {`Channel ${identifier}`}
        </Badge>

        <Group gap="sm">
          <Tooltip label={REGULATION_TOOLTIPS[regulationMode]}>
            <Text component="span" className={classes.modeTag}>
              {regulationMode}
            </Text>
          </Tooltip>

          <Switch
            size="md"
            color={color}
            onLabel={<IconBolt size={16} stroke={2.5} />}
          />
        </Group>
      </Group>

      <Stack gap="xs">
        <ParameterRow
          label="Voltage"
          value={voltage}
          unit="V"
          min={0}
          max={VOLTAGE_MAX}
          setTooltip="Target voltage on output"
          protectionLabel="OVP"
          protectionTooltip="Over-voltage protection limit"
        />

        <ParameterRow
          label="Current"
          value={current}
          unit="A"
          min={0}
          max={CURRENT_MAX}
          setTooltip="Target current on output"
          protectionLabel="OCP"
          protectionTooltip="Over-current protection limit"
        />

        <div className={classes.powerRow}>
          <Text className={classes.rowLabel}>Power</Text>
          <ReadingValue value={voltage * current} unit="W" />
        </div>
      </Stack>
    </Card>
  )
}
