import { Container, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core'

import { TelemetryDeviceCard } from '../components/telemetry_device_card'
import { useDeviceStore } from '../devices/device_store'

export function TelemetryPage() {
  const { devices } = useDeviceStore()

  if (devices.length === 0) {
    return (
      <Container>
        <Stack gap="xs" py="md">
          <Text fw={600}>No devices connected</Text>
          <Text c="dimmed" size="sm">
            Connect ProtoV MINI devices on the Devices page to view live telemetry, register
            dumps, and serial consoles.
          </Text>
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
