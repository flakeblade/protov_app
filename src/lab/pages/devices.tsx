import {
  Badge,
  Box,
  Button,
  Card,
  Code,
  Container,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core'
import { IconCode, IconNumber, IconNut } from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'

import classes from './devices.module.css'
import type { Channel } from '../components/channel_chip'
import { ChannelChip } from '../components/channel_chip'

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

interface DeviceBadge {
  label: string
  icon: Icon
}

interface DeviceCardProps {
  name: string
  port: string
  description: string
  badges: DeviceBadge[]
  channels: Channel[]
  onButtonClick?: () => void
}

function DeviceImagePlaceholder({ name }: { name: string }) {
  return (
    <Box
      h={150}
      bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text c="dimmed" size="sm">
        {name}
      </Text>
    </Box>
  )
}

export function DeviceCard({
  name,
  port,
  description,
  badges,
  channels,
  onButtonClick,
}: DeviceCardProps) {
  const details = badges.map((badge) => {
    const Icon = badge.icon
    return (
      <Badge
        color="grey"
        variant="transparent"
        key={badge.label}
        leftSection={<Icon size={12} />}
      >
        <Code>{badge.label}</Code>
      </Badge>
    )
  })

  const channelDetails = channels.map((ch) => (
    <ChannelChip key={ch.identifier} channel={ch} />
  ))

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Card.Section>
        <DeviceImagePlaceholder name={name} />
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500}>{name}</Text>
        <Code>{port}</Code>
      </Group>

      <Stack justify="space-between" align="stretch" style={{ flex: 1 }}>
        <Text size="sm" c="dimmed">
          {description}
        </Text>

        <Card.Section className={classes.section}>
          <Text mt="md" className={classes.label} c="dimmed">
            DETAILS
          </Text>
          <Group gap={7} mt={5}>
            {details}
          </Group>
        </Card.Section>

        <Card.Section className={classes.section}>
          <Text mt="md" className={classes.label} c="dimmed">
            AT A GLANCE
          </Text>
          <Group gap={7} mt={5}>
            {channelDetails}
          </Group>
        </Card.Section>

        <Button
          variant="outline"
          color="grey"
          fullWidth
          mt="md"
          radius="md"
          onClick={onButtonClick}
        >
          Disable
        </Button>
      </Stack>
    </Card>
  )
}
