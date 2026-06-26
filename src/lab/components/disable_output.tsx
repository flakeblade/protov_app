import { ActionIcon, Tooltip } from '@mantine/core'
import { IconPower } from '@tabler/icons-react'
import cx from 'clsx'

import { useDeviceStore } from '../devices/device_store'
import classes from './theme_toggle.module.css'

export function DisableOutput() {
  const { disableAllOutputs, devices } = useDeviceStore()
  const disabled = devices.length === 0

  return (
    <Tooltip label="Disable all outputs">
      <ActionIcon
        onClick={() => {
          void disableAllOutputs()
        }}
        variant="outline"
        size="xl"
        radius="md"
        aria-label="Disable all outputs"
        color="red"
        disabled={disabled}
      >
        <IconPower className={cx(classes.icon)} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  )
}
