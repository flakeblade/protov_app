import { Group, Text } from '@mantine/core'
import classes from './SidebarBrand.module.css'

export function SidebarBrand() {
  return (
    <div className={classes.brand}>
      <Text className={classes.brandName}>
        Flake &amp; Blade Robotics Design Inc.
      </Text>
      <Group gap="xs" className={classes.meta}>
        <Text className={classes.metaItem}>© 2026</Text>
        <Text className={classes.metaItem}>v0.1.0</Text>
      </Group>
    </div>
  )
}
