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
}

export function AppNavbar({ leftSection, variant = 'fixed' }: AppNavbarProps) {
  const inner = (
    <Group justify="space-between" h="100%" wrap="nowrap">
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
          classes.embedded,
          RemoveScroll.classNames.fullWidth,
          RemoveScroll.classNames.zeroRight,
        )}
      >
        <Group h="100%" px="md" wrap="nowrap">
          {inner}
        </Group>
      </div>
    )
  }

  return (
    <header
      className={cx(
        classes.header,
        classes.fixed,
        RemoveScroll.classNames.fullWidth,
        RemoveScroll.classNames.zeroRight,
      )}
    >
      <Container size="xl" h="100%" px="md">
        {inner}
      </Container>
    </header>
  )
}
