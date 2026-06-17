import type {
  HeroSceneKeyframe,
  HeroSceneKeyframeConfig,
  HeroScenePose,
  Vec3Keyframe,
} from '../types/heroSceneKeyframes'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpVec3(a: Vec3Keyframe, b: Vec3Keyframe, t: number): Vec3Keyframe {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  }
}

function lerpKeyframe(a: HeroSceneKeyframe, b: HeroSceneKeyframe, t: number): HeroScenePose {
  return {
    position: lerpVec3(a.position, b.position, t),
    rotation: lerpVec3(a.rotation, b.rotation, t),
    scale: lerp(a.scale, b.scale, t),
    blowUp: lerp(a.blowUp, b.blowUp, t),
  }
}

/** Map raw scroll progress to a pose by interpolating between adjacent keyframes. */
export function interpolatePoseAtScroll(
  config: HeroSceneKeyframeConfig,
  scroll: number,
): HeroScenePose {
  const sorted = [...config.keyframes].sort((a, b) => a.scroll - b.scroll)
  const progress = clamp(scroll, 0, 1)

  if (progress <= sorted[0].scroll) return poseFromKeyframe(sorted[0])
  if (progress >= sorted[sorted.length - 1].scroll) {
    return poseFromKeyframe(sorted[sorted.length - 1])
  }

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i]
    const next = sorted[i + 1]
    if (progress >= current.scroll && progress <= next.scroll) {
      const span = next.scroll - current.scroll
      const t = span > 0 ? (progress - current.scroll) / span : 0
      return lerpKeyframe(current, next, t)
    }
  }

  return poseFromKeyframe(sorted[sorted.length - 1])
}

export function poseFromKeyframe(keyframe: HeroSceneKeyframe): HeroScenePose {
  return {
    position: { ...keyframe.position },
    rotation: { ...keyframe.rotation },
    scale: keyframe.scale,
    blowUp: keyframe.blowUp,
  }
}

export function damp(current: number, target: number, lambda: number, delta: number) {
  return lerp(current, target, 1 - Math.exp(-lambda * delta))
}

export function dampVec3(
  current: Vec3Keyframe,
  target: Vec3Keyframe,
  lambda: number,
  delta: number,
): Vec3Keyframe {
  return {
    x: damp(current.x, target.x, lambda, delta),
    y: damp(current.y, target.y, lambda, delta),
    z: damp(current.z, target.z, lambda, delta),
  }
}

/** Fast burst at start, long smooth settle into the final pose. */
export function easeOutSnap(t: number) {
  const x = clamp(t, 0, 1)
  if (x === 1) return 1

  const rate = 11
  const raw = 1 - Math.exp(-rate * x)
  const end = 1 - Math.exp(-rate)
  return raw / end
}

/** Normalized intro progress (0–1) with the same snap easing as the pose. */
export function introProgressAtElapsed(elapsed: number, duration: number) {
  return easeOutSnap(clamp(elapsed / duration, 0, 1))
}

/** Time-based intro pose — dynamic start, decelerates into the catalyze keyframe. */
export function introPoseAtElapsed(
  elapsed: number,
  duration: number,
  start: HeroScenePose,
  end: HeroScenePose,
): HeroScenePose {
  const t = easeOutSnap(clamp(elapsed / duration, 0, 1))
  return {
    position: lerpVec3(start.position, end.position, t),
    rotation: lerpVec3(start.rotation, end.rotation, t),
    scale: lerp(start.scale, end.scale, t),
    blowUp: lerp(start.blowUp, end.blowUp, t),
  }
}

export function dampPose(
  current: HeroScenePose,
  target: HeroScenePose,
  lambda: number,
  delta: number,
): HeroScenePose {
  return {
    position: dampVec3(current.position, target.position, lambda, delta),
    rotation: dampVec3(current.rotation, target.rotation, lambda, delta),
    scale: damp(current.scale, target.scale, lambda, delta),
    blowUp: damp(current.blowUp, target.blowUp, lambda, delta),
  }
}
