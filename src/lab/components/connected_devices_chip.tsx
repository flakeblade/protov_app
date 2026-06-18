import { Badge, Group, Stack } from '@mantine/core'
import { IconTransfer, IconUsb } from '@tabler/icons-react'

interface ConnectedDevicesChipProps {
  stacked?: boolean
}

export function ConnectedDevicesChip({ stacked = false }: ConnectedDevicesChipProps) {
  const badges = (
    <>
      <Badge variant="outline" color="grey" leftSection={<IconTransfer size={14} />}>
        Stream: active
      </Badge>
      <Badge variant="outline" color="grey" leftSection={<IconUsb size={14} />}>
        Connected: 1
      </Badge>
    </>
  )

  if (stacked) {
    return <Stack gap={1}>{badges}</Stack>
  }

  return <Group gap="xs">{badges}</Group>
}
