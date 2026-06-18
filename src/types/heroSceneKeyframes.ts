export interface Vec3Keyframe {
  x: number
  y: number
  z: number
}

export interface BlobKeyframe {
  /** 0–1 across the canvas width. */
  x: number
  /** 0–1 across the canvas height. */
  y: number
  scale: number
}

export interface BlobSetKeyframe {
  red: BlobKeyframe
  blue: BlobKeyframe
  purple: BlobKeyframe
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
  /** CSS color blob positions for this scroll stop. */
  blobs?: BlobSetKeyframe
}

export interface HeroSceneIntroConfig {
  /** Seconds to animate from blown-up to the catalyze keyframe on load. */
  duration: number
  /** blowUp value at page load before intro runs. */
  blowUpStart: number
  /** CSS blur in px at load; eases to 0 with the intro. */
  blurStart?: number
  /** Seconds before color blobs begin fading in. */
  blobAppearDelay?: number
  /** Seconds for the blob fade-in after the delay. */
  blobAppearDuration?: number
}

export interface HeroSceneModelOffset {
  position: Vec3Keyframe
  /** Euler rotation in degrees, applied around the model origin. */
  rotation: Vec3Keyframe
}

export interface HeroSceneKeyframeConfig {
  /** Exponential damping factor for visual smoothing (higher = snappier). */
  smoothing: number
  /** Vertical spread per part when blowUp = 1. */
  blowUpSpread: number
  /** Global size multiplier applied on top of keyframe scale values. */
  modelScale?: number
  /** Global position/rotation offset around the model origin. */
  modelOffset?: HeroSceneModelOffset
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

export interface HeroBlobPose {
  red: BlobKeyframe
  blue: BlobKeyframe
  purple: BlobKeyframe
}
