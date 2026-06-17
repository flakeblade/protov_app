import { Center, Loader, Paper } from '@mantine/core'

export function Scene3DFallback() {
  return (
    <Paper withBorder radius="md" p="md" h={420}>
      <Center h="100%">
        <Loader color="blue" type="dots" />
      </Center>
    </Paper>
  )
}
