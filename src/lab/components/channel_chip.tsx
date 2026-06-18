import { Chip, NumberFormatter } from '@mantine/core'
import { useState } from 'react'

import classes from './channel_chip.module.css'

export interface Channel {
  identifier: string
  color: string
  voltage: number
  current: number
  active: boolean
}

interface ChannelChipProps {
  channel: Channel
}

export function ChannelChip({ channel }: ChannelChipProps) {
  const [checked, setChecked] = useState(channel.active)

  return (
    <Chip
      checked={checked}
      onChange={(value) => setChecked(value)}
      color={channel.color}
      variant="outline"
    >
      {`CH${channel.identifier} - `}
      <span className={classes.reading}>
        <NumberFormatter value={channel.voltage} decimalScale={3} fixedDecimalScale />
        {' V @ '}
        <NumberFormatter value={channel.current} decimalScale={3} fixedDecimalScale />
        {' A'}
      </span>
    </Chip>
  )
}
