import { useEffect } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import { useDisclosure } from '@mantine/hooks'
import { AppShell, Burger } from '@mantine/core'
import { Navigate, useParams } from 'react-router-dom'
import { AppNavbar } from '../components/AppNavbar'
import { SidebarBrand } from '../components/SidebarBrand'
import { HomeSpotlight } from '../components/home/HomeSpotlight'
import { DocViewer } from '../docs/DocViewer'
import { DocsSidebar } from '../docs/DocsSidebar'
import { validDocSlugs } from '../docs/docModules'
import { useDocSlug } from '../docs/useDocSlug'
import shellClasses from '../docs/docsSidebar.module.css'

export default function DocsPage() {
  const isMobile = useIsMobile()
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure()
  const { '*': splat = '' } = useParams()
  const segment = splat.split('/').filter(Boolean)[0]
  const slug = useDocSlug()

  if (segment && !validDocSlugs.has(segment)) {
    return <Navigate to="/docs" replace />
  }

  const sidebarToggle = (
    <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
  )

  useEffect(() => {
    if (isMobile) {
      closeMobile()
    }
  }, [slug, isMobile, closeMobile])

  return (
    <>
      <HomeSpotlight />
      <AppShell
        padding="md"
        header={{ height: 60 }}
        navbar={{
          width: 280,
          breakpoint: 'sm',
          collapsed: { mobile: !mobileOpened },
        }}
      >
        <AppShell.Header>
          <AppNavbar variant="embedded" tone="app" leftSection={sidebarToggle} />
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <nav className={shellClasses.shell}>
            <div className={shellClasses.main}>
              <DocsSidebar onItemClick={closeMobile} />
            </div>
            <div className={shellClasses.footer}>
              <SidebarBrand />
            </div>
          </nav>
        </AppShell.Navbar>

        <AppShell.Main>
          <DocViewer key={slug} slug={slug} />
        </AppShell.Main>
      </AppShell>
    </>
  )
}
