import type { ReactNode } from 'react'
import { Anchor, Button, Group, Kbd } from '@mantine/core'
import { spotlight } from '@mantine/spotlight'
import {
  IconArrowUpRight,
  IconBook,
  IconFlask,
  IconHome,
  IconSearch,
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { useNavPage } from '../hooks/useNavPage'
import { ActionToggle } from '../lab/components/theme_toggle'
import classes from './AppNavbarActions.module.css'

const CROWD_SUPPLY_URL =
  'https://www.crowdsupply.com/flake-and-blade-robotics-design/protov-mini'

interface NavActionButtonProps {
  icon: ReactNode
  label: string
  to: string
  className?: string
}

function NavActionButton({ icon, label, to, className }: NavActionButtonProps) {
  const isMobile = useIsMobile()

  return (
    <Button
      component={Link}
      to={to}
      variant="subtle"
      color="gray"
      size="sm"
      className={className}
      leftSection={isMobile ? undefined : icon}
      aria-label={label}
    >
      {isMobile ? icon : <span className={classes.navButtonLabel}>{label}</span>}
    </Button>
  )
}

export function AppNavbarActions() {
  const page = useNavPage()
  const isMobile = useIsMobile()

  return (
    <Group gap="sm">
      <Button
        variant="subtle"
        color="gray"
        size="sm"
        className={classes.searchButton}
        onClick={() => spotlight.open()}
        leftSection={isMobile ? undefined : <IconSearch size={16} />}
        aria-label="Search"
      >
        {isMobile ? (
          <IconSearch size={16} />
        ) : (
          <>
            <span className={classes.searchLabel}>Search</span>
            <Kbd size="xs" className={classes.searchKbd}>
              ⌘K
            </Kbd>
          </>
        )}
      </Button>
      {page !== 'home' && (
        <NavActionButton
          to="/"
          icon={<IconHome size={16} />}
          label="Home"
          className={classes.navButton}
        />
      )}
      {page !== 'lab' && (
        <NavActionButton
          to="/lab"
          icon={<IconFlask size={16} />}
          label="Lab"
          className={classes.navButton}
        />
      )}
      {page !== 'docs' && (
        <NavActionButton
          to="/docs"
          icon={<IconBook size={16} />}
          label="Docs"
          className={classes.navButton}
        />
      )}
      {page === 'home' && (
        <Anchor
          href={CROWD_SUPPLY_URL}
          target="_blank"
          rel="noreferrer"
          className={classes.orderLink}
          aria-label="Order on Crowd Supply"
        >
          <IconArrowUpRight size={16} className={classes.orderIcon} />
          <span className={classes.orderLabel}>Order ↗</span>
        </Anchor>
      )}
      <ActionToggle />
    </Group>
  )
}
