import { Button, Container, Group, Stack, Text, Title } from '@mantine/core'
import { IconBrowserOff } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { labUnsupportedReason } from '../support/lab-support'
import classes from './lab_unsupported_notice.module.css'

export function LabUnsupportedNotice() {
  return (
    <main className={classes.main}>
      <Container size="sm" className={classes.card}>
        <Stack align="center" gap="md" py="xl">
          <IconBrowserOff size={40} stroke={1.5} />
          <Stack align="center" gap={4}>
            <Title order={2} size="h3">
              Lab not available in this browser
            </Title>
            <Text size="sm" c="dimmed" ta="center">
              {labUnsupportedReason()} Use a recent desktop version of Chrome, Edge, or Firefox to
              connect and control ProtoV MINI hardware.
            </Text>
          </Stack>
          <Group justify="center" gap="sm">
            <Button component={Link} to="/">
              Go home
            </Button>
            <Button component={Link} to="/docs" variant="light">
              Docs
            </Button>
          </Group>
        </Stack>
      </Container>
    </main>
  )
}
