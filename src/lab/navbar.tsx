import {
  IconAdjustments,
  IconBolt,
  IconGraph,
  IconHeartbeat,
} from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'
import { Group, SegmentedControl, Stack, Text } from '@mantine/core'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { SidebarBrand } from '../components/SidebarBrand'

import classes from './navbar.module.css'
import { ConnectedDevicesChip } from './components/connected_devices_chip'
import { DisableOutput } from './components/disable_output'
import { isPathAllowedInView, useLabView, type LabView } from './lab_view'

interface NavItem {
  link: string
  label: string
  icon: Icon
  views: LabView[]
}

const NAV_ITEMS: NavItem[] = [
  { link: '/lab/devices', label: 'Devices', icon: IconBolt, views: ['standard', 'engineering'] },
  { link: '/lab/controls', label: 'Controls', icon: IconAdjustments, views: ['standard', 'engineering'] },
  { link: '/lab/graphs', label: 'Graphs', icon: IconGraph, views: ['standard', 'engineering'] },
  { link: '/lab/telemetry', label: 'Telemetry', icon: IconHeartbeat, views: ['engineering'] },
]

interface NavbarSimpleProps {
  onNavigate?: () => void
}

export function NavbarSimple({ onNavigate }: NavbarSimpleProps) {
  const { view, setView } = useLabView()
  const navigate = useNavigate()
  const location = useLocation()

  const visibleItems = NAV_ITEMS.filter((item) => item.views.includes(view))

  const links = visibleItems.map((item) => (
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

  const handleViewChange = (value: string) => {
    const nextView = value as LabView
    setView(nextView)

    if (!isPathAllowedInView(location.pathname, nextView)) {
      navigate('/lab/devices')
      onNavigate?.()
    }
  }

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>{links}</div>

      <div className={classes.footer}>
        <Stack gap="md">
          <Stack gap="sm" className={classes.statusSection}>
            <Text className={classes.viewLabel}>CONNECTIVITY</Text>
            <Group justify="space-between" align="center" wrap="nowrap">
              <DisableOutput />
              <ConnectedDevicesChip stacked />
            </Group>
          </Stack>

          <Stack gap="xs" className={classes.viewSection}>
            <Text className={classes.viewLabel}>View</Text>
            <SegmentedControl
              fullWidth
              size="xs"
              value={view}
              onChange={handleViewChange}
              data={[
                { label: 'Standard', value: 'standard' },
                { label: 'Engineering', value: 'engineering' },
              ]}
            />
          </Stack>

          <SidebarBrand />
        </Stack>
      </div>
    </nav>
  )
}
