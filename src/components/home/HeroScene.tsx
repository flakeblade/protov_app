import { Suspense, use, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { useComputedColorScheme } from '@mantine/core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import {
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  NoToneMapping,
  Object3D,
  SRGBColorSpace,
} from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

import sceneUrl from '../../assets/3d/scene_backup.glb?url'
import keyframeData from '../../data/heroSceneKeyframes.json'
import {
  dampPose,
  introPoseAtElapsed,
  introProgressAtElapsed,
  interpolatePoseAtScroll,
  poseFromKeyframe,
} from '../../lib/heroKeyframeInterpolation'
import type { HeroSceneKeyframeConfig, HeroScenePose } from '../../types/heroSceneKeyframes'
import {
  extractBlowUpParts,
  extractDeviceRoot,
  ISOMETRIC_CAMERA_POSITION,
  normalizeModel,
  zoomForViewport,
} from './heroSceneUtils'
import classes from './HeroScene.module.css'

const EDGE_THRESHOLD = 10
const KEYFRAME_CONFIG = keyframeData as HeroSceneKeyframeConfig
const MODEL_SCALE = KEYFRAME_CONFIG.modelScale ?? 1
const MODEL_OFFSET = KEYFRAME_CONFIG.modelOffset ?? {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
}
const CATALYZE_KEYFRAME =
  KEYFRAME_CONFIG.keyframes.find((keyframe) => keyframe.id === 'catalyze') ??
  KEYFRAME_CONFIG.keyframes[0]

function applyOutlineStyle(root: Object3D, edgeColor: string) {
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh || !mesh.geometry) return

    mesh.material = new MeshBasicMaterial({
      color: 'white',
      transparent: false,
      opacity: 1.0,
      depthWrite: true,
    })

    mesh.getObjectByName('__outline_edges__')?.removeFromParent()

    const edges = new LineSegments(
      new EdgesGeometry(mesh.geometry, EDGE_THRESHOLD),
      new LineBasicMaterial({ color: edgeColor, depthTest: true }),
    )
    edges.name = '__outline_edges__'
    edges.renderOrder = 2
    mesh.add(edges)
  })
}

function IsometricCamera() {
  const { size } = useThree()
  const zoom = zoomForViewport(size.width, size.height)

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
}: {
  viewportRef: RefObject<HTMLDivElement | null>
  introElapsed: RefObject<number>
}) {
  useFrame(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const intro = KEYFRAME_CONFIG.intro
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
  edgeColor,
  introElapsed,
}: {
  scrollProgress: number
  edgeColor: string
  introElapsed: RefObject<number>
}) {
  use(MeshoptDecoder.ready)

  const gltf = useLoader(GLTFLoader, sceneUrl, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder)
  }) as GLTF

  const poseRef = useRef<Group>(null)
  const partWrapperRefs = useRef<Group[]>([])
  const introStartPose = useRef<HeroScenePose>({
    ...poseFromKeyframe(CATALYZE_KEYFRAME),
    blowUp: KEYFRAME_CONFIG.intro?.blowUpStart ?? 1,
  })
  const smoothedPose = useRef<HeroScenePose>({
    ...poseFromKeyframe(CATALYZE_KEYFRAME),
    blowUp: KEYFRAME_CONFIG.intro?.blowUpStart ?? 1,
  })

  const model = useMemo(() => {
    const device = extractDeviceRoot(gltf.scene)
    if (!device) return null

    const { object: wrapper } = normalizeModel(device)
    const deviceRoot = wrapper.children[0]
    const parts = extractBlowUpParts(deviceRoot)
    wrapper.remove(deviceRoot)

    return {
      fitPosition: wrapper.position.clone(),
      fitScale: wrapper.scale.x,
      parts,
    }
  }, [gltf.scene])

  useLayoutEffect(() => {
    if (!model) return
    for (const part of model.parts) applyOutlineStyle(part, edgeColor)
  }, [model, edgeColor])

  useFrame((_, delta) => {
    if (!poseRef.current || !model) return

    const target = interpolatePoseAtScroll(KEYFRAME_CONFIG, scrollProgress)
    const intro = KEYFRAME_CONFIG.intro
    const introActive = intro !== undefined && introElapsed.current < intro.duration
    const lambda = KEYFRAME_CONFIG.smoothing

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

    const { position, rotation, scale, blowUp } = smoothedPose.current
    const deg = Math.PI / 180

    poseRef.current.position.set(
      position.x + MODEL_OFFSET.position.x,
      position.y + MODEL_OFFSET.position.y,
      position.z + MODEL_OFFSET.position.z,
    )
    poseRef.current.rotation.set(
      (rotation.x + MODEL_OFFSET.rotation.x) * deg,
      (rotation.y + MODEL_OFFSET.rotation.y) * deg,
      (rotation.z + MODEL_OFFSET.rotation.z) * deg,
    )
    poseRef.current.scale.setScalar(scale * MODEL_SCALE)

    const centerIndex = (model.parts.length - 1) / 2 + 0.5
    const spread = KEYFRAME_CONFIG.blowUpSpread

    for (let i = 0; i < model.parts.length; i += 1) {
      const wrapper = partWrapperRefs.current[i]
      if (!wrapper) continue
      wrapper.position.y = (i - centerIndex) * spread * blowUp
    }
  })

  if (!model) return null

  return (
    <group ref={poseRef}>
      <group position={model.fitPosition} scale={model.fitScale}>
        {model.parts.map((part, index) => (
          <group
            key={part.uuid}
            ref={(element) => {
              if (element) partWrapperRefs.current[index] = element
            }}
          >
            <primitive object={part} />
          </group>
        ))}
      </group>
    </group>
  )
}

function SceneContent({
  scrollProgress,
  edgeColor,
  viewportRef,
}: {
  scrollProgress: number
  edgeColor: string
  viewportRef: RefObject<HTMLDivElement | null>
}) {
  const introElapsed = useRef(0)

  return (
    <>
      <IsometricCamera />
      <ambientLight intensity={1} />
      <IntroBlurController viewportRef={viewportRef} introElapsed={introElapsed} />
      <DeviceModel
        scrollProgress={scrollProgress}
        edgeColor={edgeColor}
        introElapsed={introElapsed}
      />
    </>
  )
}

interface HeroSceneProps {
  scrollProgress: number
}

export default function HeroScene({ scrollProgress }: HeroSceneProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const colorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  })
  const edgeColor = colorScheme === 'dark' ? '#f0f0f0' : '#141414'

  return (
    <div ref={viewportRef} className={classes.viewport}>
      <Canvas
        className={classes.canvas}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true,
      outputColorSpace: SRGBColorSpace,
      toneMapping: NoToneMapping,
        }}
      >
        <Suspense fallback={null}>
          <SceneContent
            scrollProgress={scrollProgress}
            edgeColor={edgeColor}
            viewportRef={viewportRef}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
