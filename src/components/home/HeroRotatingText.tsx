import { useEffect, useState } from 'react'
import { Button, Stack } from '@mantine/core'
import classes from './HeroRotatingText.module.css'

const WORDS = ['prototyping', 'experimentation', 'creativity'] as const
const INTERVAL_MS = 2800
const CROWD_SUPPLY_URL =
  'https://www.crowdsupply.com/flake-and-blade-robotics-design/protov-mini'

export function HeroRotatingText() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % WORDS.length)
    }, INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <Stack gap="xl">
      <h1 className={classes.heroTitle}>
        <span className={classes.line}>
          <span>Catalyze</span>
          <span className={classes.wordSlot} aria-live="polite">
            {WORDS.map((word, wordIndex) => (
              <span
                key={word}
                className={`${classes.word} ${
                  wordIndex === index ? classes.wordActive : classes.wordInactive
                }`}
              >
                {word}.
              </span>
            ))}
          </span>
        </span>
      </h1>

      <Stack gap="md" className={classes.heroCopy}>
        <p className={classes.subtitle}>
          Credit-card sized. Dual-channel. USB Type-C powered.
        </p>
        <Button
          component="a"
          href={CROWD_SUPPLY_URL}
          target="_blank"
          rel="noreferrer"
          variant="default"
          color="gray"
          size="md"
          className={classes.orderButton}
        >
          Order on Crowd Supply →
        </Button>
      </Stack>
    </Stack>
  )
}
