import { Button, Card, Code, Stack, Text } from '@mantine/core'
import { IconPlugConnected } from '@tabler/icons-react'

import { usesMockTransport } from '../serial/request-port'
import classes from './device_card.module.css'

interface ConnectDeviceCardProps {
  connecting: boolean
  connectedCount: number
  maxDevices: number
  onConnect: () => void
}

function connectDescription(connectedCount: number, maxDevices: number): string {
  if (usesMockTransport()) {
    return `Connect up to ${maxDevices} mock devices over the built-in WebSocket bridge (${connectedCount}/${maxDevices} connected).`
  }

  if (import.meta.env.DEV) {
    return `Connect up to ${maxDevices} ProtoV MINI devices via USB serial (${connectedCount}/${maxDevices} connected).`
  }

  return `Choose a serial port in the browser dialog to add a ProtoV MINI power supply (${connectedCount}/${maxDevices} connected).`
}

export function ConnectDeviceCard({
  connecting,
  connectedCount,
  maxDevices,
  onConnect,
}: ConnectDeviceCardProps) {
  const atLimit = connectedCount >= maxDevices
  const isMock = usesMockTransport()
  const isDevWebSerial = import.meta.env.DEV && !isMock

  return (
    <Card
      shadow="sm"
      padding="xl"
      radius="md"
      withBorder
      className={classes.cardShell}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Stack align="center" gap="md" maw={320}>
        <IconPlugConnected size={40} stroke={1.5} />
        <Stack align="center" gap={4}>
          <Text fw={600}>Connect a device</Text>
          <Text size="sm" c="dimmed" ta="center">
            {connectDescription(connectedCount, maxDevices)}
          </Text>
          {isMock ? (
            <Text size="xs" c="dimmed" ta="center">
              Start the Rust mock (<Code>just run-mock</Code> in protov), then click Connect.
            </Text>
          ) : isDevWebSerial ? (
            <Text size="xs" c="dimmed" ta="center">
              Click Connect and choose your ProtoV MINI in the browser serial port dialog.
            </Text>
          ) : null}
        </Stack>
        <Button loading={connecting} disabled={atLimit} onClick={onConnect}>
          {atLimit ? 'Maximum devices connected' : 'Connect'}
        </Button>
      </Stack>
    </Card>
  )
}
