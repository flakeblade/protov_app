import { Container, SimpleGrid, Skeleton } from '@mantine/core'

import { ChannelGraphCard } from '../graphs/ChannelGraphCard'
import { createMockChannelSeries } from '../graphs/mockSeries'

const MOCK_NOW = Date.now()

const CHANNELS = [
  { identifier: 'A', color: 'red', voltage: 3.3, current: 0.5, voltageSetpoint: 3.3, currentSetpoint: 0.5, active: true, seed: 1 },
  { identifier: 'B', color: 'blue', voltage: 1.8, current: 0.1, voltageSetpoint: 5.0, currentSetpoint: 1.0, active: true, seed: 2 },
  { identifier: 'C', color: 'yellow', voltage: 1.8, current: 0.1, voltageSetpoint: 12.0, currentSetpoint: 0.25, active: true, seed: 3 },
  { identifier: 'D', color: 'green', voltage: 1.8, current: 0.1, voltageSetpoint: 1.8, currentSetpoint: 0.1, active: true, seed: 4 },
] as const

export function GraphsPage() {
  return (
    <Container>
      <SimpleGrid
        type="container"
        // cols={{ base: 1, '300px': 1, '850px': 2 }}
        cols={{ base: 1 }}
        spacing={{ base: 'md' }}
      >
        {CHANNELS.map((channel) => (
          <Skeleton key={channel.identifier} radius="md" visible={false} animate={false}>
            <ChannelGraphCard
              identifier={channel.identifier}
              color={channel.color}
              voltage={channel.voltage}
              current={channel.current}
              voltageSetpoint={channel.voltageSetpoint}
              currentSetpoint={channel.currentSetpoint}
              active={channel.active}
              series={createMockChannelSeries(channel.seed, MOCK_NOW)}
            />
          </Skeleton>
        ))}

        <Skeleton radius="md" animate />
        <Skeleton radius="md" animate />
      </SimpleGrid>
    </Container>
  )
}
