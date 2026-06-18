import { Container, Stack, Text, Title } from '@mantine/core'
import { AppNavbar } from '../components/AppNavbar'
import { HomeSpotlight } from '../components/home/HomeSpotlight'

export default function DocsPage() {
  return (
    <>
      <AppNavbar />
      <HomeSpotlight />
      <Container size="sm" py="xl" pt={88}>
        <Stack gap="lg">
          <Stack gap="xs">
            <Title order={1}>Documentation</Title>
            <Text c="dimmed">
              Documentation will live here. This is a temporary placeholder.
            </Text>
          </Stack>
        </Stack>
      </Container>
    </>
  )
}
