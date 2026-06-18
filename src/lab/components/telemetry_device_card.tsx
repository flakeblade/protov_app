import type { ComponentType, ReactNode } from 'react'
import {
  Badge,
  Button,
  Card,
  Code,
  Group,
  NumberFormatter,
  Stack,
  Text,
} from '@mantine/core'
import {
  IconActivity,
  IconAntennaBars5,
  IconBinary,
  IconCode,
  IconNumber,
  IconNut,
  IconPlug,
} from '@tabler/icons-react'

import { SerialConsolePanel, useSerialConsole } from './serial_console'
import { TemperatureMeters } from './temperature_meters'
import {
  formatIna226Dump,
  formatTps55289Dump,
  registerDumpCommand,
} from '../telemetry/register_dumps'
import type { TelemetryDevice } from '../telemetry/types'
import classes from './telemetry_device_card.module.css'

interface TelemetryDeviceCardProps {
  device: TelemetryDevice
}

function CompactBadge({
  label,
  icon: Icon,
}: {
  label: ReactNode
  icon?: ComponentType<{ size?: number }>
}) {
  return (
    <Badge
      color="grey"
      variant="transparent"
      size="sm"
      className={classes.badge}
      leftSection={Icon ? <Icon size={10} /> : undefined}
    >
      <Code className={classes.badgeCode}>{label}</Code>
    </Badge>
  )
}

export function TelemetryDeviceCard({ device }: TelemetryDeviceCardProps) {
  const console = useSerialConsole(device.port, device.baudRate)

  const inputLabel =
    device.input.type === 'pd'
      ? `PD ${device.input.voltage.toFixed(1)} V`
      : `USB ${device.input.voltage.toFixed(1)} V`

  const dumpRegisters = (chip: 'ina226' | 'tps55289', channel: 'A' | 'B') => {
    const cmd = registerDumpCommand(chip, channel)
    const dump = chip === 'ina226' ? formatIna226Dump(channel) : formatTps55289Dump(channel)

    console.appendLine('tx', cmd)
    console.appendLine('rx', dump)
  }

  return (
    <Card shadow="sm" padding="sm" radius="md" withBorder className={classes.card}>
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Text size="sm" fw={600}>
            {device.name}
          </Text>
          <Code className={classes.port}>{device.port}</Code>
        </Group>

        <Group gap={5} wrap="wrap">
          <CompactBadge label={`FW v${device.firmwareVersion}`} icon={IconCode} />
          <CompactBadge label={`HW ${device.hardwareVersion}`} icon={IconNut} />
          <CompactBadge label={`SN ${device.serialNumber}`} icon={IconNumber} />
          <CompactBadge label={`${device.baudRate} baud`} icon={IconAntennaBars5} />
        </Group>

        <Group gap={5} wrap="wrap">
          <CompactBadge label={inputLabel} icon={IconPlug} />
          <CompactBadge
            label={
              <>
                <NumberFormatter value={device.input.current} decimalScale={1} fixedDecimalScale />
                {' A'}
              </>
            }
          />
          <Badge
            size="sm"
            color={device.health.senseOk ? 'teal' : 'red'}
            variant="light"
            leftSection={<IconActivity size={10} />}
          >
            INA226
          </Badge>
          <Badge
            size="sm"
            color={device.health.converterOk ? 'teal' : 'red'}
            variant="light"
            leftSection={<IconActivity size={10} />}
          >
            TPS55289
          </Badge>
        </Group>

        <TemperatureMeters temperatures={device.temperatures} compact />

        <Stack gap={4}>
          <Text className={classes.sectionLabel} c="dimmed">
            REGISTER DUMP
          </Text>
          <Group gap={6} wrap="wrap">
            <Button
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconBinary size={12} />}
              onClick={() => dumpRegisters('ina226', 'A')}
            >
              INA226 A
            </Button>
            <Button
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconBinary size={12} />}
              onClick={() => dumpRegisters('ina226', 'B')}
            >
              INA226 B
            </Button>
            <Button
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconBinary size={12} />}
              onClick={() => dumpRegisters('tps55289', 'A')}
            >
              TPS55289 A
            </Button>
            <Button
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconBinary size={12} />}
              onClick={() => dumpRegisters('tps55289', 'B')}
            >
              TPS55289 B
            </Button>
          </Group>
        </Stack>

        <div className={classes.consoleSection}>
          <SerialConsolePanel
            lines={console.lines}
            command={console.command}
            setCommand={console.setCommand}
            onSend={console.handleSend}
            compact
          />
        </div>
      </Stack>
    </Card>
  )
}
