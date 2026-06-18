import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { useDisclosure } from '@mantine/hooks'
import { AppShell, Burger } from '@mantine/core'
import { AppNavbar } from '../components/AppNavbar'
import { HomeSpotlight } from '../components/home/HomeSpotlight'
import { NavbarSimple } from './navbar'
import { DevicesPage } from './pages/devices'
import { ControlsPage } from './pages/controls'
import { MeasurementsPage } from './pages/measurements'
import { GraphsPage } from './pages/graphs'
import { TelemetryPage } from './pages/telemetry'

export default function LabApp() {
  const isMobile = useIsMobile()
  const location = useLocation()
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure()
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true)

  const sidebarToggle = (
    <>
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
    </>
  )

  useEffect(() => {
    if (isMobile) {
      closeMobile()
    }
  }, [location.pathname, isMobile, closeMobile])

  return (
    <>
      <HomeSpotlight />
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
          <AppNavbar variant="embedded" tone="app" leftSection={sidebarToggle} />
        </AppShell.Header>

        <AppShell.Navbar p="sm">
          <NavbarSimple onNavigate={closeMobile} />
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
    </>
  )
}
