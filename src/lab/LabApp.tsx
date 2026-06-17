import { Navigate, Route, Routes } from 'react-router-dom'
import { useDisclosure } from '@mantine/hooks'
import { AppShell, Burger, Group } from '@mantine/core'
import { NavbarSimple } from './navbar'
import { Logo } from './components/logo'
import { ConnectedDevicesChip } from './components/connected_devices_chip'
import { DisableOutput } from './components/disable_output'
import { DevicesPage } from './pages/devices'
import { ControlsPage } from './pages/controls'
import { MeasurementsPage } from './pages/measurements'
import { GraphsPage } from './pages/graphs'
import { TelemetryPage } from './pages/telemetry'

export default function LabApp() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure()
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true)

  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{
        width: 275,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group h="100%" px="md">
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
            />
            <Burger
              opened={desktopOpened}
              onClick={toggleDesktop}
              visibleFrom="sm"
              size="sm"
            />
            <Logo height="50%" style={{ paddingTop: '7px' }} />
          </Group>
          <Group>
            <Group visibleFrom="sm">
              <ConnectedDevicesChip />
            </Group>
            <DisableOutput />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <NavbarSimple />
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route index element={<Navigate to="devices" replace />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="controls" element={<ControlsPage />} />
          <Route path="measurements" element={<MeasurementsPage />} />
          <Route path="graphs" element={<GraphsPage />} />
          <Route path="telemetry" element={<TelemetryPage />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}
