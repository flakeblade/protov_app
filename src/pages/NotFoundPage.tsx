import { Button, Container, Group, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'
import FbrdLogo from '../assets/fbrd_logo.svg'
import { AppNavbar } from '../components/AppNavbar'
import { HomeSpotlight } from '../components/home/HomeSpotlight'
import { Logo } from '../lab/components/logo'
import classes from './NotFoundPage.module.css'

export function NotFoundView() {
  return (
    <Container size="sm" className={classes.card}>
      <Stack align="center" gap="lg">
        <Logo className={classes.logo} />

        <Stack align="center" gap={4}>
          <Title order={1} className={classes.code}>
            404
          </Title>
          <Title order={2} size="h3">
            Page not found
          </Title>
          <Text c="dimmed" size="sm" maw={360}>
            The page you are looking for does not exist, or the link may be out of date.
          </Text>
        </Stack>

        <Group justify="center" gap="sm">
          <Button component={Link} to="/">
            Go home
          </Button>
          <Button component={Link} to="/lab" variant="light">
            Open lab
          </Button>
          <Button component={Link} to="/docs" variant="subtle">
            Docs
          </Button>
        </Group>

        <img src={FbrdLogo} alt="" aria-hidden className={classes.brandMark} />
      </Stack>
    </Container>
  )
}

export default function NotFoundPage() {
  return (
    <div className={classes.page}>
      <AppNavbar />
      <HomeSpotlight />
      <main className={classes.main}>
        <NotFoundView />
      </main>
    </div>
  )
}
