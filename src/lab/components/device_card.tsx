import type { ReactNode } from 'react'
import {
  Badge,
  Box,
  Button,
  Card,
  Code,
  Group,
  Stack,
  Text,
} from '@mantine/core'
import type { Icon } from '@tabler/icons-react'

import type { Channel } from './channel_chip'
import { ChannelChip } from './channel_chip'
import classes from './device_card.module.css'

export interface DeviceBadge {
  label: string
  icon: Icon
}

export interface DeviceCardProps {
  name: string
  port: string
  description: string
  badges: DeviceBadge[]
  channels: Channel[]
  onButtonClick?: () => void
  buttonLabel?: string
  hideButton?: boolean
  children?: ReactNode
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
  buttonLabel = 'Disable',
  hideButton = false,
  children,
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

        {children}

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

        {!hideButton && (
          <Button
            variant="outline"
            color="grey"
            fullWidth
            mt="md"
            radius="md"
            onClick={onButtonClick}
          >
            {buttonLabel}
          </Button>
        )}
      </Stack>
    </Card>
  )
}
