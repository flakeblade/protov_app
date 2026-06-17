import { lazy, Suspense } from 'react'
import { AppShell, Container, Group, Stack, Text, Title } from '@mantine/core'
import { Scene3DFallback } from './components/Scene3DFallback'

const Scene3D = lazy(() => import('./components/Scene3D'))

function App() {
  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={3}>ProtoV</Title>
          <Text size="sm" c="dimmed">
            Vite · Mantine · Three.js
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="lg">
          <Stack gap="lg">
            <Stack gap={4}>
              <Title order={1}>3D Web Frontend</Title>
              <Text c="dimmed">
                Static build configured for GitHub Pages deployment.
              </Text>
            </Stack>

            <Suspense fallback={<Scene3DFallback />}>
              <Scene3D />
            </Suspense>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

export default App
