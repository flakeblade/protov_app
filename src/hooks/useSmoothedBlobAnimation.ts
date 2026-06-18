import { useEffect, useRef, type RefObject } from 'react'

import keyframeData from '../data/heroSceneKeyframes.json'
import {
  blobsFromKeyframe,
  dampBlobs,
  introBlobsAtElapsed,
  interpolateBlobsAtScroll,
} from '../lib/heroKeyframeInterpolation'
import type { BlobKeyframe, HeroBlobPose, HeroSceneKeyframeConfig } from '../types/heroSceneKeyframes'

const CONFIG = keyframeData as HeroSceneKeyframeConfig

const CATALYZE_KEYFRAME =
  CONFIG.keyframes.find((keyframe) => keyframe.id === 'catalyze') ?? CONFIG.keyframes[0]

const INTRO_START_BLOBS: HeroBlobPose = {
  red: { x: 0.5, y: 0.18, scale: 1.35 },
  blue: { x: 0.9, y: 0.78, scale: 1.3 },
  purple: { x: 0.06, y: 0.1, scale: 1.4 },
}

function applyBlobElement(
  element: HTMLElement | null,
  blob: BlobKeyframe,
  sizeFactor: number,
) {
  if (!element) return

  const size = `${sizeFactor * blob.scale}vmin`
  element.style.width = size
  element.style.height = size
  element.style.left = `${blob.x * 100}%`
  element.style.top = `${blob.y * 100}%`
  element.style.transform = 'translate(-50%, -50%)'
}

function applyBlobTransforms(
  core: HTMLElement | null,
  trail1: HTMLElement | null,
  trail2: HTMLElement | null,
  blob: BlobKeyframe,
  trail1Pose: BlobKeyframe,
  trail2Pose: BlobKeyframe,
) {
  applyBlobElement(core, blob, 42)
  applyBlobElement(trail1, trail1Pose, 34)
  applyBlobElement(trail2, trail2Pose, 26)
}

interface BlobElementRefs {
  layer: RefObject<HTMLElement | null>
  redCore: RefObject<HTMLElement | null>
  redTrail1: RefObject<HTMLElement | null>
  redTrail2: RefObject<HTMLElement | null>
  blueCore: RefObject<HTMLElement | null>
  blueTrail1: RefObject<HTMLElement | null>
  blueTrail2: RefObject<HTMLElement | null>
  purpleCore: RefObject<HTMLElement | null>
  purpleTrail1: RefObject<HTMLElement | null>
  purpleTrail2: RefObject<HTMLElement | null>
}

export function useSmoothedBlobAnimation(scrollProgress: number, refs: BlobElementRefs) {
  const scrollRef = useRef(scrollProgress)
  scrollRef.current = scrollProgress

  const introElapsed = useRef(0)
  const smoothed = useRef<HeroBlobPose>(INTRO_START_BLOBS)
  const trail1 = useRef<HeroBlobPose>(INTRO_START_BLOBS)
  const trail2 = useRef<HeroBlobPose>(INTRO_START_BLOBS)

  useEffect(() => {
    let frame = 0
    let last = performance.now()

    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05)
      last = now

      const targetBlobs = interpolateBlobsAtScroll(CONFIG, scrollRef.current)
      const intro = CONFIG.intro
      const introActive = intro !== undefined && introElapsed.current < intro.duration

      if (introActive) {
        introElapsed.current += delta
        smoothed.current = introBlobsAtElapsed(
          introElapsed.current,
          intro.duration,
          INTRO_START_BLOBS,
          blobsFromKeyframe(CATALYZE_KEYFRAME),
        )
      } else {
        smoothed.current = dampBlobs(smoothed.current, targetBlobs, CONFIG.smoothing, delta)
      }

      trail1.current = dampBlobs(trail1.current, smoothed.current, CONFIG.smoothing * 0.55, delta)
      trail2.current = dampBlobs(trail2.current, trail1.current, CONFIG.smoothing * 0.4, delta)

      applyBlobTransforms(
        refs.redCore.current,
        refs.redTrail1.current,
        refs.redTrail2.current,
        smoothed.current.red,
        trail1.current.red,
        trail2.current.red,
      )
      applyBlobTransforms(
        refs.blueCore.current,
        refs.blueTrail1.current,
        refs.blueTrail2.current,
        smoothed.current.blue,
        trail1.current.blue,
        trail2.current.blue,
      )
      applyBlobTransforms(
        refs.purpleCore.current,
        refs.purpleTrail1.current,
        refs.purpleTrail2.current,
        smoothed.current.purple,
        trail1.current.purple,
        trail2.current.purple,
      )

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [
    refs.layer,
    refs.redCore,
    refs.redTrail1,
    refs.redTrail2,
    refs.blueCore,
    refs.blueTrail1,
    refs.blueTrail2,
    refs.purpleCore,
    refs.purpleTrail1,
    refs.purpleTrail2,
  ])
}
