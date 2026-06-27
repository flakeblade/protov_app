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
import { useLabView } from '../lab_view'
import protovMiniImage from '../../assets/img/protov_mini.jpg'
import classes from './device_card.module.css'

export interface DeviceBadge {
  label: string
  icon: Icon
}

export interface DeviceCardProps {
  name: string
  description: string
  badges: DeviceBadge[]
  channels: Channel[]
  onButtonClick?: () => void
  buttonLabel?: string
  onSecondaryButtonClick?: () => void
  secondaryButtonLabel?: string
  secondaryButtonLoading?: boolean
  onChannelToggle?: (identifier: string) => void
  hideButton?: boolean
  children?: ReactNode
}

export function DeviceCard({
  name,
  description,
  badges,
  channels,
  onButtonClick,
  buttonLabel = 'Disable',
  onSecondaryButtonClick,
  secondaryButtonLabel,
  secondaryButtonLoading = false,
  onChannelToggle,
  hideButton = false,
  children,
}: DeviceCardProps) {
  const { isEngineering } = useLabView()

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

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder className={classes.cardShell}>
      <Card.Section className={classes.imageSection}>
        <img src={protovMiniImage} alt={name} className={classes.deviceImage} />
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500}>{name}</Text>
      </Group>

      <Stack justify="space-between" align="stretch" style={{ flex: 1 }}>
        <Text size="sm" c="dimmed" mih={40}>
          {description}
        </Text>

        {children}

        {isEngineering ? (
          <Card.Section className={classes.section}>
            <Text mt="md" className={classes.label} c="dimmed">
              DETAILS
            </Text>
            <Group gap={7} mt={5} className={classes.sectionSpacer}>
              {details}
            </Group>
          </Card.Section>
        ) : null}

        <Card.Section className={classes.section}>
          <Text mt="md" className={classes.label} c="dimmed">
            AT A GLANCE
          </Text>
          <Stack gap={6} mt={5} className={classes.sectionSpacer}>
            {channels.map((ch) => (
              <ChannelChip key={ch.identifier} channel={ch} onToggle={onChannelToggle} />
            ))}
          </Stack>
        </Card.Section>

        {!hideButton && (onButtonClick || onSecondaryButtonClick) ? (
          <Stack gap="xs" mt="md" className={classes.buttonStack}>
            {onButtonClick ? (
              <Button variant="filled" color="gray" fullWidth radius="md" onClick={onButtonClick}>
                {buttonLabel}
              </Button>
            ) : null}
            {onSecondaryButtonClick ? (
              <Button
                variant="outline"
                color="grey"
                fullWidth
                radius="md"
                loading={secondaryButtonLoading}
                disabled={secondaryButtonLoading}
                onClick={onSecondaryButtonClick}
              >
                {secondaryButtonLabel ?? 'Secondary'}
              </Button>
            ) : null}
          </Stack>
        ) : (
          <Box className={classes.buttonStack} />
        )}
      </Stack>
    </Card>
  )
}
