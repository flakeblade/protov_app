import { Button, Container, Group } from '@mantine/core'
import { IconBook, IconFlask } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { Logo } from '../../lab/components/logo'
import { ActionToggle } from '../../lab/components/theme_toggle'
import classes from './HomeNavbar.module.css'

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
            >
              Lab
            </Button>
            <Button
              component={Link}
              to="/docs"
              variant="subtle"
              color="gray"
              size="sm"
              className={classes.navButton}
              leftSection={<IconBook size={16} />}
            >
              Docs
            </Button>
            <ActionToggle />
          </Group>
        </Group>
      </Container>
    </header>
  )
}
