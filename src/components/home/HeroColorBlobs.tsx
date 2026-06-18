import { useMemo, useRef, type CSSProperties } from 'react'

import keyframeData from '../../data/heroSceneKeyframes.json'
import { useSmoothedBlobAnimation } from '../../hooks/useSmoothedBlobAnimation'
import type { HeroSceneKeyframeConfig } from '../../types/heroSceneKeyframes'
import classes from './HeroColorBlobs.module.css'

const KEYFRAME_CONFIG = keyframeData as HeroSceneKeyframeConfig

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
  const purpleCoreRef = useRef<HTMLDivElement>(null)
  const purpleTrail1Ref = useRef<HTMLDivElement>(null)
  const purpleTrail2Ref = useRef<HTMLDivElement>(null)

  useSmoothedBlobAnimation(scrollProgress, {
    layer: layerRef,
    redCore: redCoreRef,
    redTrail1: redTrail1Ref,
    redTrail2: redTrail2Ref,
    blueCore: blueCoreRef,
    blueTrail1: blueTrail1Ref,
    blueTrail2: blueTrail2Ref,
    purpleCore: purpleCoreRef,
    purpleTrail1: purpleTrail1Ref,
    purpleTrail2: purpleTrail2Ref,
  })

  const appearStyle = useMemo(() => {
    const intro = KEYFRAME_CONFIG.intro
    return {
      '--blob-appear-delay': `${intro?.blobAppearDelay ?? 0.7}s`,
      '--blob-appear-duration': `${intro?.blobAppearDuration ?? 1.4}s`,
    } as CSSProperties
  }, [])

  return (
    <div ref={layerRef} className={classes.layer} style={appearStyle} aria-hidden>
      <div className={classes.purpleGroup}>
        <div
          ref={purpleTrail2Ref}
          className={`${classes.blob} ${classes.trail} ${classes.trailFar} ${classes.purple}`}
        />
        <div ref={purpleTrail1Ref} className={`${classes.blob} ${classes.trail} ${classes.purple}`} />
        <div ref={purpleCoreRef} className={`${classes.blob} ${classes.core} ${classes.purple}`} />
      </div>

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
    </div>
  )
}
