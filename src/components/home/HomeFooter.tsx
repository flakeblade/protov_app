import { Anchor, Container, Group, Stack, Text } from '@mantine/core'
import classes from './HomeFooter.module.css'

export function HomeFooter() {
  return (
    <footer className={classes.footer}>
      <Container size="xl" px="md">
        <Stack gap="md">
          <Text className={classes.company} size="sm">
            Flake &amp; Blade Robotics Design Inc. © 2026
          </Text>

          <Text className={classes.meta}>
            Montréal, Québec — bold, compact, USB Type-C powered open-source tools
            for modern prototyping and experimentation.
          </Text>

          <Group gap="lg" className={classes.meta}>
            <Anchor
              href="https://flakeblade.com"
              target="_blank"
              rel="noreferrer"
              className={classes.link}
              size="sm"
            >
              flakeblade.com
            </Anchor>
            <Anchor
              href="https://www.crowdsupply.com/flake-and-blade-robotics-design/protov-mini"
              target="_blank"
              rel="noreferrer"
              className={classes.link}
              size="sm"
            >
              ProtoV MINI on Crowd Supply
            </Anchor>
            <Anchor
              href="https://github.com/thataquarel/protovolt"
              target="_blank"
              rel="noreferrer"
              className={classes.link}
              size="sm"
            >
              Open source (EPL-2.0)
            </Anchor>
          </Group>

          <Text className={classes.meta} size="xs" c="dimmed">
            ProtoV MINI · 85.5 × 54.0 × 17.5 mm · dual-channel · 0–20 V · 0–5 A
            · USB-C PD up to 100 W · RP2040
          </Text>
        </Stack>
      </Container>
    </footer>
  )
}
