import { Button, Stack } from '@mantine/core'
import { Link } from 'react-router-dom'
import classes from './HeroScrollPanel.module.css'

interface HeroScrollPanelProps {
  title: React.ReactNode
  subtitle: string
  eyebrow?: string
  specs?: string[]
  buttonLabel?: string
  buttonTo?: string
  buttonHref?: string
}

export function HeroScrollPanel({
  title,
  subtitle,
  eyebrow,
  specs,
  buttonLabel,
  buttonTo,
  buttonHref,
}: HeroScrollPanelProps) {
  return (
    <Stack gap="xl" className={classes.panel}>
      <Stack gap="sm">
        {eyebrow && <p className={classes.step}>{eyebrow}</p>}
        <h2 className={classes.title}>{title}</h2>
        <p className={classes.subtitle}>{subtitle}</p>
        {specs && specs.length > 0 && (
          <div className={classes.specs}>
            {specs.map((spec) => (
              <span key={spec} className={classes.specPill}>
                {spec}
              </span>
            ))}
          </div>
        )}
      </Stack>
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
