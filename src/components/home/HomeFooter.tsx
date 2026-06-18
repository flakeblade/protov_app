import { Anchor, Container, Text, useComputedColorScheme } from '@mantine/core'
import FbrdLogo from '../../assets/fbrd_logo.svg'
import classes from './HomeFooter.module.css'

export function HomeFooter() {
  const colorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true })

  return (
    <footer className={classes.footer}>
      <Container size="xl" px="md">
        <div className={classes.grid}>
          <div className={classes.brandColumn}>
            <div>
              <div>
              <img
                src={FbrdLogo}
                alt="Flake & Blade Robotics Design"
                className={classes.brandLogo}
                style={{
                  filter: colorScheme === 'dark' ? 'invert(1)' : 'none',
                }}
                />
              </div>
              
              <Text className={classes.company}>
                Flake &amp; Blade Robotics Design Inc.
              </Text>
            </div>
            <Text className={classes.tagline}>
              Montréal, Québec — bold, compact, USB Type-C powered open-source tools
              for modern prototyping and experimentation.
            </Text>
            <Text className={classes.copyright}>© 2026</Text>
          </div>

          <div className={classes.linksColumn}>
            <Text className={classes.columnLabel}>Links</Text>
            <nav className={classes.linkList} aria-label="Footer links">
              <Anchor
                href="https://flakeblade.com"
                target="_blank"
                rel="noreferrer"
                className={classes.link}
              >
                flakeblade.com
              </Anchor>
              <Anchor
                href="https://www.crowdsupply.com/flake-and-blade-robotics-design/protov-mini"
                target="_blank"
                rel="noreferrer"
                className={classes.link}
              >
                ProtoV MINI on Crowd Supply
              </Anchor>
              <Anchor
                href="https://github.com/thataquarel/protovolt"
                target="_blank"
                rel="noreferrer"
                className={classes.link}
              >
                Open source (EPL-2.0)
              </Anchor>
            </nav>
          </div>

          <div className={classes.specsColumn}>
            <Text className={classes.columnLabel}>ProtoV MINI</Text>
            <ul className={classes.specList}>
              <li>85.5 × 54.0 × 17.5 mm</li>
              <li>Dual-channel</li>
              <li>0–20 V · 0–5 A</li>
              <li>USB-C PD up to 100 W</li>
              <li>RP2040</li>
            </ul>
          </div>
        </div>
      </Container>
    </footer>
  )
}
