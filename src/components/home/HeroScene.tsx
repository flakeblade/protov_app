import { Suspense, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { useComputedColorScheme } from '@mantine/core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { Group, NoToneMapping, SRGBColorSpace } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { HERO_SCENE_GLB_URL } from '../../scene/heroAssetUrls'
import { getHeroKeyframeConfig } from '../../scene/heroKeyframeConfig'
import {
  dampPose,
  introPoseAtElapsed,
  introProgressAtElapsed,
  interpolatePoseAtScroll,
  poseFromKeyframe,
} from '../../lib/heroKeyframeInterpolation'
import { applyBlowUpSpread, prepareModelFromGltf } from '../../scene/modelLoader'
import {
  installOutlineRenderer,
  updateModelColors,
  type ModelColors,
  type OutlineRenderer,
} from '../../scene/modelRenderer'
import { ISOMETRIC_CAMERA_POSITION, zoomForViewport } from '../../scene/sceneCamera'
import { heroViewportLayout } from '../../scene/sceneLayout'
import type { HeroSceneKeyframeConfig, HeroScenePose } from '../../types/heroSceneKeyframes'
import classes from './HeroScene.module.css'

function catalyzeKeyframe(config: HeroSceneKeyframeConfig) {
  return config.keyframes.find((keyframe) => keyframe.id === 'catalyze') ?? config.keyframes[0]
}

function IsometricCamera() {
  const { size } = useThree()
  const layout = heroViewportLayout(size.width, size.height)
  const zoom = zoomForViewport(layout.zoomViewportWidth, layout.zoomViewportHeight)

  return (
    <OrthographicCamera
      makeDefault
      position={ISOMETRIC_CAMERA_POSITION}
      zoom={zoom}
      near={0.1}
      far={50}
      onUpdate={(cam) => cam.lookAt(0, 0, 0)}
    />
  )
}

function IntroBlurController({
  viewportRef,
  introElapsed,
  keyframeConfig,
}: {
  viewportRef: RefObject<HTMLDivElement | null>
  introElapsed: RefObject<number>
  keyframeConfig: HeroSceneKeyframeConfig
}) {
  useFrame(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const intro = keyframeConfig.intro
    if (!intro?.blurStart) {
      viewport.style.filter = ''
      return
    }

    const progress = introProgressAtElapsed(introElapsed.current, intro.duration)
    const blurPx = intro.blurStart * (1 - progress)
    viewport.style.filter = blurPx > 0.05 ? `blur(${blurPx}px)` : ''
  })

  return null
}

function DeviceModel({
  scrollProgress,
  modelColors,
  introElapsed,
  keyframeConfig,
}: {
  scrollProgress: number
  modelColors: ModelColors
  introElapsed: RefObject<number>
  keyframeConfig: HeroSceneKeyframeConfig
}) {
  const gltf = useLoader(GLTFLoader, HERO_SCENE_GLB_URL, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder)
  }) as GLTF

  const poseRef = useRef<Group>(null)
  const outlineRef = useRef<OutlineRenderer | null>(null)
  const { size } = useThree()
  const modelScale = keyframeConfig.modelScale ?? 1
  const modelOffset = keyframeConfig.modelOffset ?? {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  }
  const introStartPose = useRef<HeroScenePose>({
    ...poseFromKeyframe(catalyzeKeyframe(keyframeConfig)),
    blowUp: keyframeConfig.intro?.blowUpStart ?? 1,
  })
  const smoothedPose = useRef<HeroScenePose>({
    ...poseFromKeyframe(catalyzeKeyframe(keyframeConfig)),
    blowUp: keyframeConfig.intro?.blowUpStart ?? 1,
  })

  const model = useMemo(() => prepareModelFromGltf(gltf.scene), [gltf.scene])

  useLayoutEffect(() => {
    if (!model) return
    outlineRef.current = installOutlineRenderer(model.root, modelColors)
  }, [model])

  useLayoutEffect(() => {
    if (!outlineRef.current) return
    updateModelColors(outlineRef.current, modelColors)
  }, [modelColors])

  useFrame((_, delta) => {
    if (!poseRef.current || !model) return

    const target = interpolatePoseAtScroll(keyframeConfig, scrollProgress)
    const intro = keyframeConfig.intro
    const introActive = intro !== undefined && introElapsed.current < intro.duration
    const lambda = keyframeConfig.smoothing

    if (introActive) {
      introElapsed.current += delta
      smoothedPose.current = introPoseAtElapsed(
        introElapsed.current,
        intro.duration,
        introStartPose.current,
        target,
      )
    } else {
      smoothedPose.current = dampPose(smoothedPose.current, target, lambda, delta)
    }

    const layout = heroViewportLayout(size.width, size.height)
    const { position, rotation, scale, blowUp } = smoothedPose.current
    const deg = Math.PI / 180

    poseRef.current.position.set(
      position.x + modelOffset.position.x + layout.offsetX,
      position.y + modelOffset.position.y,
      position.z + modelOffset.position.z,
    )
    poseRef.current.rotation.set(
      (rotation.x + modelOffset.rotation.x) * deg,
      (rotation.y + modelOffset.rotation.y) * deg,
      (rotation.z + modelOffset.rotation.z) * deg,
    )
    poseRef.current.scale.setScalar(scale * modelScale)

    applyBlowUpSpread(model.parts, blowUp, keyframeConfig.blowUpSpread)
  })

  if (!model) return null

  return (
    <group ref={poseRef}>
      <primitive object={model.root} />
    </group>
  )
}

function SceneContent({
  scrollProgress,
  modelColors,
  viewportRef,
  keyframeConfig,
}: {
  scrollProgress: number
  modelColors: ModelColors
  viewportRef: RefObject<HTMLDivElement | null>
  keyframeConfig: HeroSceneKeyframeConfig
}) {
  const introElapsed = useRef(0)

  return (
    <>
      <IsometricCamera />
      <ambientLight intensity={1} />
      <IntroBlurController
        viewportRef={viewportRef}
        introElapsed={introElapsed}
        keyframeConfig={keyframeConfig}
      />
      <DeviceModel
        scrollProgress={scrollProgress}
        modelColors={modelColors}
        introElapsed={introElapsed}
        keyframeConfig={keyframeConfig}
      />
    </>
  )
}

interface HeroSceneProps {
  scrollProgress: number
  isMobile?: boolean
}

export default function HeroScene({ scrollProgress, isMobile = false }: HeroSceneProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const keyframeConfig = useMemo(() => getHeroKeyframeConfig(isMobile), [isMobile])
  const colorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  })
  const modelColors: ModelColors = {
    edge: colorScheme === 'dark' ? '#f0f0f0' : '#141414',
    fill: colorScheme === 'dark' ? '#141414' : '#ffffff',
  }

  return (
    <div ref={viewportRef} className={classes.viewport}>
      <Canvas
        className={classes.canvas}
        dpr={isMobile ? [1, 1] : [1, 1.5]}
        gl={{
          alpha: true,
          antialias: true,
          outputColorSpace: SRGBColorSpace,
          toneMapping: NoToneMapping,
        }}
      >
        <Suspense fallback={null}>
          <SceneContent
            key={isMobile ? 'mobile' : 'desktop'}
            scrollProgress={scrollProgress}
            modelColors={modelColors}
            viewportRef={viewportRef}
            keyframeConfig={keyframeConfig}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
