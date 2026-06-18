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
import { useNavPage } from '../hooks/useNavPage'
import { ActionToggle } from '../lab/components/theme_toggle'
import classes from './AppNavbarActions.module.css'

const CROWD_SUPPLY_URL =
  'https://www.crowdsupply.com/flake-and-blade-robotics-design/protov-mini'

export function AppNavbarActions() {
  const page = useNavPage()

  return (
    <Group gap="sm">
      <Button
        variant="subtle"
        color="gray"
        size="sm"
        className={classes.searchButton}
        onClick={() => spotlight.open()}
        leftSection={<IconSearch size={16} />}
        aria-label="Search"
      >
        <span className={classes.searchLabel}>Search</span>
        <Kbd size="xs" className={classes.searchKbd}>
          ⌘K
        </Kbd>
      </Button>
      {page !== 'home' && (
        <Button
          component={Link}
          to="/"
          variant="subtle"
          color="gray"
          size="sm"
          className={classes.navButton}
          leftSection={<IconHome size={16} />}
          aria-label="Home"
        >
          <span className={classes.navButtonLabel}>Home</span>
        </Button>
      )}
      {page !== 'lab' && (
        <Button
          component={Link}
          to="/lab"
          variant="subtle"
          color="gray"
          size="sm"
          className={classes.navButton}
          leftSection={<IconFlask size={16} />}
          aria-label="Lab"
        >
          <span className={classes.navButtonLabel}>Lab</span>
        </Button>
      )}
      {page !== 'docs' && (
        <Button
          component={Link}
          to="/docs"
          variant="subtle"
          color="gray"
          size="sm"
          className={classes.navButton}
          leftSection={<IconBook size={16} />}
          aria-label="Docs"
        >
          <span className={classes.navButtonLabel}>Docs</span>
        </Button>
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
