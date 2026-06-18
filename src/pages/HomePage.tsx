// import { lazy, Suspense, useRef } from 'react'
// import { Suspense, useRef } from 'react'
import { useEffect, useRef } from 'react'
import { Container } from '@mantine/core'
import { HomeNavbar } from '../components/home/HomeNavbar'
import { HeroRotatingText } from '../components/home/HeroRotatingText'
import { HeroScrollPanel } from '../components/home/HeroScrollPanel'
import { HomeFooter } from '../components/home/HomeFooter'
import { HeroColorBlobs } from '../components/home/HeroColorBlobs'
import { preloadHeroGlb } from '../scene/preloadHero'
// import { HeroSceneFallback } from '../components/home/HeroSceneFallback'
import { useScrollStageProgress } from '../hooks/useHeroScrollProgress'
import classes from './HomePage.module.css'
import  HeroScene from '../components/home/HeroScene'

// const HeroScene = lazy(() => import('../components/home/HeroScene'))

const PANEL_HEIGHT = 'calc(100vh - 60px)'

export default function HomePage() {
  const scrollStageRef = useRef<HTMLElement>(null)
  const scrollProgress = useScrollStageProgress(scrollStageRef)

  useEffect(() => {
    preloadHeroGlb()
  }, [])

  return (
    <div className={classes.page}>
      <HomeNavbar />

      <div className={classes.scrollExperience}>
        <div className={classes.canvasSticky} aria-hidden>
          <HeroColorBlobs scrollProgress={scrollProgress} />
          <HeroScene scrollProgress={scrollProgress} />
        </div>

        <section ref={scrollStageRef} className={classes.scrollStage}>
          <Container size="xl" px="md" className={classes.scrollContainer}>
            <div className={classes.scrollLayout}>
              <div className={classes.textPanels}>
                <div className={classes.panel} style={{ minHeight: PANEL_HEIGHT }}>
                  <HeroRotatingText />
                </div>

                <div className={classes.panel} style={{ minHeight: PANEL_HEIGHT }}>
                  <HeroScrollPanel
                    title="Connect to a breadboard"
                    subtitle="ProtoV MINI plugs directly into standard breadboard power rails with dual 2×5 pin headers — USB-C powered, credit-card sized, and built for clean bench setups in the lab or field."
                    buttonLabel="About hardware"
                    buttonTo="/docs"
                  />
                </div>

                <div className={classes.panel} style={{ minHeight: PANEL_HEIGHT }}>
                  <HeroScrollPanel
                    title="Adjust power"
                    subtitle="Set voltage and current per channel with real-time measurement — up to 20 V and 5 A per rail. Control everything from the online lab interface."
                    buttonLabel="Open lab"
                    buttonTo="/lab"
                  />
                </div>
              </div>

              <div className={classes.canvasSpacer} aria-hidden />
            </div>
          </Container>
        </section>
      </div>

      <HomeFooter />
    </div>
  )
}
