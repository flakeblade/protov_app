import {
  IconAdjustments,
  IconBolt,
  IconDeviceDesktopAnalytics,
  IconGraph,
  IconHeartbeat,
} from '@tabler/icons-react'
import { Code, Group } from '@mantine/core'
import { NavLink } from 'react-router-dom'

import classes from './navbar.module.css'
import { ActionToggle } from './components/theme_toggle'
import { DocumentationButton } from './components/footer_buttons'

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
        <Group justify="space-between">
          <Group gap="xs">
            <ActionToggle />
            <DocumentationButton />
          </Group>

          <Code fw={700}>v0.1.0</Code>
        </Group>
      </div>
    </nav>
  )
}
