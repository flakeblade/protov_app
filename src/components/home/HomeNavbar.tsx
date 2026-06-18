import { Anchor, Button, Container, Group } from '@mantine/core'
import { IconArrowUpRight, IconBook, IconFlask } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { Logo } from '../../lab/components/logo'
import { ActionToggle } from '../../lab/components/theme_toggle'
import classes from './HomeNavbar.module.css'

const CROWD_SUPPLY_URL =
  'https://www.crowdsupply.com/flake-and-blade-robotics-design/protov-mini'

export function HomeNavbar() {
  return (
    <header className={classes.header}>
      <Container size="xl" h="100%" px="md">
        <Group justify="space-between" h="100%">
          <Link to="/" className={classes.logoLink}>
            <Logo className={classes.logo} />
          </Link>

          <Group gap="sm">
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
            <ActionToggle />
          </Group>
        </Group>
      </Container>
    </header>
  )
}
