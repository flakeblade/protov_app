import desktopKeyframes from '../data/heroSceneKeyframes.json'
import mobileKeyframes from '../data/heroSceneKeyframes.mobile.json'
import type { HeroSceneKeyframeConfig } from '../types/heroSceneKeyframes'

export const DESKTOP_HERO_KEYFRAME_CONFIG = desktopKeyframes as HeroSceneKeyframeConfig
export const MOBILE_HERO_KEYFRAME_CONFIG = mobileKeyframes as HeroSceneKeyframeConfig

export function getHeroKeyframeConfig(isMobile: boolean): HeroSceneKeyframeConfig {
  return isMobile ? MOBILE_HERO_KEYFRAME_CONFIG : DESKTOP_HERO_KEYFRAME_CONFIG
}
