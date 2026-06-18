import {
  IconAdjustments,
  IconBolt,
  IconDeviceDesktopAnalytics,
  IconGraph,
  IconHeartbeat,
} from '@tabler/icons-react'
import { Code, Group, Stack, Text } from '@mantine/core'
import { NavLink } from 'react-router-dom'

import classes from './navbar.module.css'
import { ConnectedDevicesChip } from './components/connected_devices_chip'
import { DisableOutput } from './components/disable_output'

const data = [
  { link: '/lab/devices', label: 'Devices', icon: IconBolt },
  { link: '/lab/controls', label: 'Controls', icon: IconAdjustments },
  { link: '/lab/measurements', label: 'Measurements', icon: IconDeviceDesktopAnalytics },
  { link: '/lab/graphs', label: 'Graphs', icon: IconGraph },
  { link: '/lab/telemetry', label: 'Telemetry', icon: IconHeartbeat },
]

export function NavbarSimple() {
  const links = data.map((item) => (
    <NavLink
      key={item.label}
      to={item.link}
      className={({ isActive }) =>
        isActive ? `${classes.link} ${classes.linkActive}` : classes.link
      }
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </NavLink>
  ))

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>{links}</div>

      <div className={classes.footer}>
        <Stack gap="md">
          <Stack gap="sm" className={classes.statusSection}>
            <Group justify="space-between" align="center" wrap="nowrap">
              <DisableOutput />
              <ConnectedDevicesChip stacked />
            </Group>
          </Stack>

          <div className={classes.sidebarBrand}>

            <Text className={classes.brandName}>
              Flake &amp; Blade Robotics Design Inc.
            </Text>
            <Group>
              <Text className={classes.copyright}>© 2026</Text>
              <Code className={classes.version} fw={600}>
                v0.1.0
              </Code>
            </Group>
          </div>
        </Stack>
      </div>
    </nav>
  )
}
