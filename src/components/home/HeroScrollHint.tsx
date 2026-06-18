import { useEffect, useState } from 'react'
import { Box, Transition } from '@mantine/core'
import { IconChevronDown } from '@tabler/icons-react'

import classes from './HeroScrollHint.module.css'

const APPEAR_DELAY_MS = 1500

interface HeroScrollHintProps {
  scrollProgress: number
}

export function HeroScrollHint({ scrollProgress }: HeroScrollHintProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), APPEAR_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const visible = ready && scrollProgress <= 0

  return (
    <Transition mounted={visible} transition="fade" duration={280} timingFunction="ease">
      {(styles) => (
        <div className={classes.anchor} style={styles} aria-hidden>
          <Box className={classes.hint}>
            <IconChevronDown size={22} stroke={1.75} className={classes.chevron} />
          </Box>
        </div>
      )}
    </Transition>
  )
}
