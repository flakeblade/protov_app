import { useEffect, useState } from 'react'
import { Stack } from '@mantine/core'
import classes from './HeroRotatingText.module.css'

const WORDS = ['power', 'prototyping', 'experimentation'] as const
const INTERVAL_MS = 2800

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

      <p className={classes.subtitle}>
        ProtoV MINI is a credit-card-sized, dual-channel USB Type-C power supply
        that connects directly to your breadboard rails — up to 20 V per channel
        with real-time measurement in a footprint built for modern prototyping.
      </p>
    </Stack>
  )
}
