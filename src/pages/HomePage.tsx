// import { lazy, Suspense, useRef } from 'react'
// import { Suspense, useRef } from 'react'
import { useEffect, useRef } from 'react'
import { Container } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { HomeNavbar } from '../components/home/HomeNavbar'
import { HeroRotatingText } from '../components/home/HeroRotatingText'
import { HeroScrollPanel } from '../components/home/HeroScrollPanel'
import { HomeFooter } from '../components/home/HomeFooter'
import { HeroColorBlobs } from '../components/home/HeroColorBlobs'
import { HeroScrollHint } from '../components/home/HeroScrollHint'
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
  const isMobile = useMediaQuery('(max-width: 48em)', undefined, {
    getInitialValueInEffect: true,
  })

  useEffect(() => {
    preloadHeroGlb()
  }, [])

  return (
    <div className={classes.page}>
      <HomeNavbar />

      <div className={classes.scrollExperience}>
        <div className={classes.canvasSticky} aria-hidden>
          <HeroColorBlobs scrollProgress={scrollProgress} />
          <HeroScene scrollProgress={scrollProgress} isMobile={isMobile} />
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
                    eyebrow="01"
                    title="Connect to a breadboard"
                    subtitle="ProtoV MINI plugs directly into standard breadboard power rails with dual 2×5 pin headers — USB-C powered, credit-card sized, and built for clean bench setups in the lab or field."
                    specs={['2×5 pin headers', 'USB-C', 'credit-card sized', 'breadboard compatible']}
                    buttonLabel="See specs"
                    buttonTo="/docs"
                  />
                </div>

                <div className={classes.panel} style={{ minHeight: PANEL_HEIGHT }}>
                  <HeroScrollPanel
                    eyebrow="02"
                    title="Adjust power"
                    subtitle="Set voltage and current per channel with real-time measurement — up to 20 V and 5 A per rail. Control everything from the online lab interface."
                    specs={['0–20 V', '0–5 A', '100 W USB-C PD', 'per-channel control']}
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
      <HeroScrollHint scrollProgress={scrollProgress} />
    </div>
  )
}
