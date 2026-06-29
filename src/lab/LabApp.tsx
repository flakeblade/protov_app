import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { useDisclosure } from '@mantine/hooks'
import { AppShell, Burger } from '@mantine/core'
import { AppNavbar } from '../components/AppNavbar'
import { HomeSpotlight } from '../components/home/HomeSpotlight'
import { NavbarSimple } from './navbar'
import { DevicesPage } from './pages/devices'
import { ControlsPage } from './pages/controls'
import { GraphsPage } from './pages/graphs'
import { TelemetryPage } from './pages/telemetry'
import { NotFoundView } from '../pages/NotFoundPage'
import { isPathAllowedInView, LabViewProvider, useLabView } from './lab_view'

function LabRoutes() {
  const location = useLocation()
  const navigate = useNavigate()
  const { view } = useLabView()

  useEffect(() => {
    if (!isPathAllowedInView(location.pathname, view)) {
      navigate('/lab/devices', { replace: true })
    }
  }, [location.pathname, navigate, view])

  return (
    <Routes>
      <Route index element={<Navigate to="devices" replace />} />
      <Route path="devices" element={<DevicesPage />} />
      <Route path="controls" element={<ControlsPage />} />
      <Route path="graphs" element={<GraphsPage />} />
      <Route path="telemetry" element={<TelemetryPage />} />
      <Route path="*" element={<NotFoundView />} />
    </Routes>
  )
}

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
    <LabViewProvider>
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
          <LabRoutes />
        </AppShell.Main>
      </AppShell>
    </LabViewProvider>
  )
}
