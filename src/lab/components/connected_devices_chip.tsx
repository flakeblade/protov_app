import { Badge, Group, Stack } from '@mantine/core'
import { IconTransfer, IconUsb } from '@tabler/icons-react'

import { useDeviceStore } from '../devices/device_store'
import { MAX_DEVICES } from '../devices/device-colors'

interface ConnectedDevicesChipProps {
  stacked?: boolean
}

export function ConnectedDevicesChip({ stacked = false }: ConnectedDevicesChipProps) {
  const { devices } = useDeviceStore()
  const count = devices.length

  const badges = (
    <>
      <Badge variant="outline" color="grey" leftSection={<IconTransfer size={14} />}>
        Stream: {count > 0 ? 'active' : 'idle'}
      </Badge>
      <Badge variant="outline" color="grey" leftSection={<IconUsb size={14} />}>
        Connected: {count}/{MAX_DEVICES}
      </Badge>
    </>
  )

  if (stacked) {
    return <Stack gap={1}>{badges}</Stack>
  }

  return <Group gap="xs">{badges}</Group>
}
