import type { ComponentType, ReactNode } from 'react'
import { useCallback } from 'react'
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
import type { LabDevice } from '../devices/device_store'
import { queryRegisterDump, scpiRegisterDumpCommand } from '../devices/telemetry_io'
import { DEFAULT_BAUD_RATE } from '../serial/constants'
import classes from './telemetry_device_card.module.css'

interface TelemetryDeviceCardProps {
  device: LabDevice
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
  const console = useSerialConsole({
    transport: device.transport,
    port: device.port,
    baudRate: DEFAULT_BAUD_RATE,
  })

  const { telemetry } = device
  const inputLabel =
    telemetry.input.type === 'pd'
      ? `PD ${telemetry.input.voltage.toFixed(1)} V`
      : `USB ${telemetry.input.voltage.toFixed(1)} V`

  const dumpRegisters = useCallback(
    async (chip: 'ina226' | 'tps55289', channel: 'A' | 'B') => {
      const cmd = scpiRegisterDumpCommand(chip, channel)
      console.appendLine('tx', cmd)
      try {
        const dump = await queryRegisterDump(device.transport, chip, channel)
        for (const line of dump.split('\n')) {
          console.appendLine('rx', line)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Register dump failed'
        console.appendLine('sys', message)
      }
    },
    [console, device.transport],
  )

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
          <CompactBadge label={`FW v${device.fwVersion}`} icon={IconCode} />
          <CompactBadge label={`HW ${device.hwVersion}`} icon={IconNut} />
          <CompactBadge label={`SN ${device.serialNumber}`} icon={IconNumber} />
          <CompactBadge label={`${DEFAULT_BAUD_RATE} baud`} icon={IconAntennaBars5} />
        </Group>

        <Group gap={5} wrap="wrap">
          <CompactBadge label={inputLabel} icon={IconPlug} />
          <CompactBadge
            label={
              <>
                <NumberFormatter
                  value={telemetry.input.current}
                  decimalScale={1}
                  fixedDecimalScale
                />
                {' A'}
              </>
            }
          />
          <Badge
            size="sm"
            color={telemetry.health.senseOk ? 'teal' : 'red'}
            variant="light"
            leftSection={<IconActivity size={10} />}
          >
            INA226
          </Badge>
          <Badge
            size="sm"
            color={telemetry.health.converterOk ? 'teal' : 'red'}
            variant="light"
            leftSection={<IconActivity size={10} />}
          >
            TPS55289
          </Badge>
        </Group>

        <TemperatureMeters temperatures={telemetry.temperatures} compact />

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
              onClick={() => void dumpRegisters('ina226', 'A')}
            >
              INA226 A
            </Button>
            <Button
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconBinary size={12} />}
              onClick={() => void dumpRegisters('ina226', 'B')}
            >
              INA226 B
            </Button>
            <Button
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconBinary size={12} />}
              onClick={() => void dumpRegisters('tps55289', 'A')}
            >
              TPS55289 A
            </Button>
            <Button
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconBinary size={12} />}
              onClick={() => void dumpRegisters('tps55289', 'B')}
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
