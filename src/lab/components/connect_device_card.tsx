import { Button, Card, Code, Stack, Text } from '@mantine/core'
import { IconPlugConnected } from '@tabler/icons-react'

import classes from './device_card.module.css'

interface ConnectDeviceCardProps {
  connecting: boolean
  connectedCount: number
  maxDevices: number
  onConnect: () => void
}

export function ConnectDeviceCard({
  connecting,
  connectedCount,
  maxDevices,
  onConnect,
}: ConnectDeviceCardProps) {
  const atLimit = connectedCount >= maxDevices

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
            {import.meta.env.DEV
              ? `Connect up to ${maxDevices} mock devices over the built-in WebSocket bridge (${connectedCount}/${maxDevices} connected).`
              : `Choose a serial port in the browser dialog to add a ProtoV MINI power supply (${connectedCount}/${maxDevices} connected).`}
          </Text>
          {import.meta.env.DEV ? (
            <Text size="xs" c="dimmed" ta="center">
              Run <Code>npm run dev:mock</Code> in another terminal, then click Connect.
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
