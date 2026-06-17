import { Button, Center, Container, Group, Stack, Text, Title } from '@mantine/core'
import { IconFlask, IconBook } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { Logo } from '../lab/components/logo'

export default function HomePage() {
  return (
    <Container size="sm" py="xl">
      <Center>
        <Stack align="center" gap="xl" maw={480}>
          <Logo height={32} />

          <Stack align="center" gap="xs">
            <Title order={1} ta="center">
              ProtoV
            </Title>
            <Text c="dimmed" ta="center" size="lg">
              Lab power supply control and documentation — welcome page placeholder.
            </Text>
          </Stack>

          <Group>
            <Button
              component={Link}
              to="/lab"
              size="md"
              leftSection={<IconFlask size={18} />}
            >
              Lab
            </Button>
            <Button
              component={Link}
              to="/docs"
              size="md"
              variant="default"
              leftSection={<IconBook size={18} />}
            >
              Docs
            </Button>
          </Group>
        </Stack>
      </Center>
    </Container>
  )
}
