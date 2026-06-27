import { Button, Container, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core'
import { IconBolt, IconHeartbeat } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

import { TelemetryDeviceCard } from '../components/telemetry_device_card'
import { useDeviceStore } from '../devices/device_store'

export function TelemetryPage() {
  const navigate = useNavigate()
  const { devices } = useDeviceStore()

  if (devices.length === 0) {
    return (
      <Container size="sm">
        <Stack align="center" gap="md" py="xl">
          <IconHeartbeat size={40} stroke={1.5} />
          <Stack align="center" gap={4}>
            <Text fw={600}>No devices connected</Text>
            <Text size="sm" c="dimmed" ta="center">
              Connect a ProtoV MINI on the Devices page to view live telemetry, register dumps,
              and serial consoles here.
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
      <SimpleGrid type="container" cols={{ base: 1 }} spacing="sm">
        {devices.map((device) => (
          <Skeleton key={device.id} radius="md" visible={false} animate={false}>
            <TelemetryDeviceCard device={device} />
          </Skeleton>
        ))}
      </SimpleGrid>
    </Container>
  )
}
