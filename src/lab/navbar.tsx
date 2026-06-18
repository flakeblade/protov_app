import {
  IconAdjustments,
  IconBolt,
  IconDeviceDesktopAnalytics,
  IconGraph,
  IconHeartbeat,
} from '@tabler/icons-react'
import { Group, Stack } from '@mantine/core'
import { NavLink } from 'react-router-dom'
import { SidebarBrand } from '../components/SidebarBrand'

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

interface NavbarSimpleProps {
  onNavigate?: () => void
}

export function NavbarSimple({ onNavigate }: NavbarSimpleProps) {
  const links = data.map((item) => (
    <NavLink
      key={item.label}
      to={item.link}
      onClick={onNavigate}
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

          <SidebarBrand />
        </Stack>
      </div>
    </nav>
  )
}
