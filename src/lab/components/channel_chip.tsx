import { Badge, NumberFormatter, UnstyledButton } from '@mantine/core'

import classes from './channel_chip.module.css'

export interface Channel {
  identifier: string
  color: string
  /** Display voltage — live reading when output on, setpoint when off. */
  voltage: number
  /** Display current — live reading when output on, setpoint when off. */
  current: number
  measuredVoltage: number
  measuredCurrent: number
  voltageSet: number
  currentSet: number
  ovp: number
  ocp: number
  active: boolean
}

interface ChannelChipProps {
  channel: Channel
  onToggle?: (identifier: string) => void
}

export function ChannelChip({ channel, onToggle }: ChannelChipProps) {
  const handleClick = () => {
    onToggle?.(channel.identifier)
  }

  return (
    <UnstyledButton onClick={handleClick} aria-pressed={channel.active} aria-label={`Channel ${channel.identifier}`}>
      <Badge
        className={`${classes.chip} ${channel.active ? '' : classes.chipInactive}`}
        color={channel.color}
        size="lg"
        variant={channel.active ? 'filled' : 'outline'}
        fullWidth
      >
        <span className={classes.chipInner}>
          <span className={classes.chipMeta}>
            <span className={classes.channelLabel}>Channel {channel.identifier}</span>
            <span className={classes.stateTag}>{channel.active ? 'Output on' : 'Output off'}</span>
          </span>
          <span className={classes.readings}>
            <span className={classes.readingGroup}>
              <NumberFormatter value={channel.voltage} decimalScale={3} fixedDecimalScale />
              <span className={classes.unit}>V</span>
            </span>
            <span className={classes.readingGroup}>
              <NumberFormatter value={channel.current} decimalScale={3} fixedDecimalScale />
              <span className={classes.unit}>A</span>
            </span>
          </span>
        </span>
      </Badge>
    </UnstyledButton>
  )
}
