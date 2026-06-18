import type { ReactNode } from 'react'
import { Container, Group, RemoveScroll } from '@mantine/core'
import cx from 'clsx'
import { Link } from 'react-router-dom'
import { Logo } from '../lab/components/logo'
import { AppNavbarActions } from './AppNavbarActions'
import classes from './AppNavbar.module.css'

interface AppNavbarProps {
  leftSection?: ReactNode
  variant?: 'fixed' | 'embedded'
  tone?: 'marketing' | 'app'
}

export function AppNavbar({
  leftSection,
  variant = 'fixed',
  tone = 'marketing',
}: AppNavbarProps) {
  const bar = (
    <Group justify="space-between" h="100%" w="100%" wrap="nowrap">
      <Group h="100%" gap="sm" wrap="nowrap">
        {leftSection}
        <Link to="/" className={classes.logoLink}>
          <Logo className={classes.logo} />
        </Link>
      </Group>
      <AppNavbarActions />
    </Group>
  )

  if (variant === 'embedded') {
    return (
      <div
        className={cx(
          classes.header,
          tone === 'app' ? classes.headerApp : classes.headerMarketing,
          classes.embedded,
          RemoveScroll.classNames.fullWidth,
          RemoveScroll.classNames.zeroRight,
        )}
      >
        <Group h="100%" px="md" w="100%" wrap="nowrap">
          {bar}
        </Group>
      </div>
    )
  }

  return (
    <header
      className={cx(
        classes.header,
        tone === 'app' ? classes.headerApp : classes.headerMarketing,
        classes.fixed,
        RemoveScroll.classNames.fullWidth,
        RemoveScroll.classNames.zeroRight,
      )}
    >
      <Container size="xl" h="100%" px="md">
        {bar}
      </Container>
    </header>
  )
}
