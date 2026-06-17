import { Button, Container, Stack, Text, Title } from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { Logo } from '../lab/components/logo'

export default function DocsPage() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Logo height={32} />

        <Stack gap="xs">
          <Title order={1}>Documentation</Title>
          <Text c="dimmed">
            Documentation will live here. This is a temporary placeholder.
          </Text>
        </Stack>

        <Button
          component={Link}
          to="/"
          variant="default"
          leftSection={<IconArrowLeft size={18} />}
          w="fit-content"
        >
          Back to home
        </Button>
      </Stack>
    </Container>
  )
}
