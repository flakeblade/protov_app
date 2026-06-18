import { useRef } from 'react'

import { useSmoothedBlobAnimation } from '../../hooks/useSmoothedBlobAnimation'
import classes from './HeroColorBlobs.module.css'

interface HeroColorBlobsProps {
  scrollProgress: number
}

export function HeroColorBlobs({ scrollProgress }: HeroColorBlobsProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const redCoreRef = useRef<HTMLDivElement>(null)
  const redTrail1Ref = useRef<HTMLDivElement>(null)
  const redTrail2Ref = useRef<HTMLDivElement>(null)
  const blueCoreRef = useRef<HTMLDivElement>(null)
  const blueTrail1Ref = useRef<HTMLDivElement>(null)
  const blueTrail2Ref = useRef<HTMLDivElement>(null)

  useSmoothedBlobAnimation(scrollProgress, {
    layer: layerRef,
    redCore: redCoreRef,
    redTrail1: redTrail1Ref,
    redTrail2: redTrail2Ref,
    blueCore: blueCoreRef,
    blueTrail1: blueTrail1Ref,
    blueTrail2: blueTrail2Ref,
  })

  return (
    <div ref={layerRef} className={classes.layer} aria-hidden>
      <div className={classes.redGroup}>
        <div ref={redTrail2Ref} className={`${classes.blob} ${classes.trail} ${classes.trailFar} ${classes.red}`} />
        <div ref={redTrail1Ref} className={`${classes.blob} ${classes.trail} ${classes.red}`} />
        <div ref={redCoreRef} className={`${classes.blob} ${classes.core} ${classes.red}`} />
      </div>

      <div className={classes.blueGroup}>
        <div ref={blueTrail2Ref} className={`${classes.blob} ${classes.trail} ${classes.trailFar} ${classes.blue}`} />
        <div ref={blueTrail1Ref} className={`${classes.blob} ${classes.trail} ${classes.blue}`} />
        <div ref={blueCoreRef} className={`${classes.blob} ${classes.core} ${classes.blue}`} />
      </div>

      <div className={classes.purpleHaze} />
    </div>
  )
}
