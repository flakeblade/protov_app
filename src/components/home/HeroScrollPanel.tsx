import { Button, Stack } from '@mantine/core'
import { Link } from 'react-router-dom'
import classes from './HeroScrollPanel.module.css'

interface HeroScrollPanelProps {
  title: React.ReactNode
  subtitle: string
  buttonLabel?: string
  buttonTo?: string
  buttonHref?: string
}

export function HeroScrollPanel({
  title,
  subtitle,
  buttonLabel,
  buttonTo,
  buttonHref,
}: HeroScrollPanelProps) {
  return (
    <Stack gap="xl" className={classes.panel}>
      <h2 className={classes.title}>{title}</h2>
      <p className={classes.subtitle}>{subtitle}</p>
      {buttonLabel && buttonTo && (
        <Button
          component={Link}
          to={buttonTo}
          variant="default"
          color="gray"
          size="md"
          className={classes.button}
        >
          {buttonLabel}
        </Button>
      )}
      {buttonLabel && buttonHref && !buttonTo && (
        <Button
          component="a"
          href={buttonHref}
          target="_blank"
          rel="noreferrer"
          variant="default"
          color="gray"
          size="md"
          className={classes.button}
        >
          {buttonLabel}
        </Button>
      )}
    </Stack>
  )
}
