import { Container, SimpleGrid, Skeleton } from '@mantine/core'
import { IconCode, IconNumber, IconNut } from '@tabler/icons-react'

import { DeviceCard } from '../components/device_card'

export function DevicesPage() {
  return (
    <Container>
      <SimpleGrid
        type="container"
        cols={{ base: 1, '300px': 1, '700px': 2, '900px': 3 }}
        spacing={{ base: 'md' }}
      >
        <Skeleton radius="md" animate visible={false}>
          <DeviceCard
            name="ProtoV MINI"
            port="/dev/ttyACM0"
            description="Dual-channel, USB-C powered, credit card-sized lab power supply for electronics prototyping and field testing."
            badges={[
              { label: 'FW v0.1.0', icon: IconCode },
              { label: 'HW rev A.1', icon: IconNut },
              { label: 'SN 550e8400', icon: IconNumber },
            ]}
            channels={[
              { identifier: 'A', color: 'red', voltage: 3.3, current: 0.5, active: true },
              { identifier: 'B', color: 'blue', voltage: 1.8, current: 0.1, active: true },
            ]}
            onButtonClick={() => console.log('Go to controls clicked')}
          />
        </Skeleton>
        <Skeleton radius="md" animate visible={false}>
          <DeviceCard
            name="ProtoV MINI"
            port="COM10"
            description="Dual-channel, USB-C powered, credit card-sized lab power supply for electronics prototyping and field testing."
            badges={[
              { label: 'FW v0.1.1', icon: IconCode },
              { label: 'HW rev B.2', icon: IconNut },
              { label: 'SN 32983fe4', icon: IconNumber },
            ]}
            channels={[
              { identifier: 'A', color: 'yellow', voltage: 20.0, current: 5.0, active: true },
              { identifier: 'B', color: 'green', voltage: 5.0, current: 1.0, active: true },
            ]}
            onButtonClick={() => console.log('Go to controls clicked')}
          />
        </Skeleton>
        <Skeleton radius="md" animate />
        <Skeleton radius="md" animate />
      </SimpleGrid>
    </Container>
  )
}
