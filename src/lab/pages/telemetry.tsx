import { Container, SimpleGrid, Skeleton } from '@mantine/core'

import { TelemetryDeviceCard } from '../components/telemetry_device_card'
import { MOCK_TELEMETRY_DEVICES } from '../telemetry/types'

export function TelemetryPage() {
  return (
    <Container>
      <SimpleGrid
        type="container"
        // cols={{ base: 1, '700px': 2, '1100px': 2 }}
        cols={{ base: 1 }}
        spacing="sm"
      >
        {MOCK_TELEMETRY_DEVICES.map((device) => (
          <Skeleton key={device.id} radius="md" visible={false} animate={false}>
            <TelemetryDeviceCard device={device} />
          </Skeleton>
        ))}
      </SimpleGrid>
    </Container>
  )
}
