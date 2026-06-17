export interface Vec3Keyframe {
  x: number
  y: number
  z: number
}

export interface HeroSceneKeyframe {
  id: string
  /** Normalized scroll position 0–1 through the scroll stage. */
  scroll: number
  position: Vec3Keyframe
  /** Euler rotation in degrees. */
  rotation: Vec3Keyframe
  scale: number
  /** 0 = assembled, 1 = fully blown up along vertical axis. */
  blowUp: number
}

export interface HeroSceneIntroConfig {
  /** Seconds to animate from blown-up to the catalyze keyframe on load. */
  duration: number
  /** blowUp value at page load before intro runs. */
  blowUpStart: number
}

export interface HeroSceneKeyframeConfig {
  /** Exponential damping factor for visual smoothing (higher = snappier). */
  smoothing: number
  /** Vertical spread per part when blowUp = 1. */
  blowUpSpread: number
  /** Load-time assembly animation on the catalyze screen. */
  intro?: HeroSceneIntroConfig
  keyframes: HeroSceneKeyframe[]
}

export interface HeroScenePose {
  position: Vec3Keyframe
  rotation: Vec3Keyframe
  scale: number
  blowUp: number
}
