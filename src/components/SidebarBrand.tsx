import { Group, Text } from '@mantine/core'
import classes from './SidebarBrand.module.css'

export function SidebarBrand() {
  return (
    <div className={classes.brand}>
      <Text className={classes.brandName}>
        Flake &amp; Blade Robotics Design Inc.
      </Text>
      <Group gap="xs" className={classes.meta}>
        <Text className={classes.metaItem}>&copy; {__BUILD_YEAR__}</Text>
        <Text className={classes.metaItem}>v{__APP_VERSION__}</Text>
      </Group>
    </div>
  )
}
