import { Box3, Group, Object3D, Vector3 } from 'three'

export const SCENE_ROOT_NAME = 'protov_mini'
export const ASSEMBLY_GROUP_NAME = 'protov_mini_1'

export interface ModelPart {
  object: Object3D
  basePosition: Vector3
}

/** Normalized, ready-to-animate model. Centroid at origin, max dimension = 1. */
export interface PreparedModel {
  root: Group
  parts: ModelPart[]
}

function isBreadboardNode(name: string) {
  return name.toLowerCase().startsWith('breadboard')
}

function extractDeviceRoot(scene: Object3D): Object3D | null {
  const mini =
    scene.getObjectByName(SCENE_ROOT_NAME) ??
    scene.children.find((child) => {
      const name = child.name.toLowerCase()
      return name.includes('protov') || name.includes('mini')
    })

  if (!mini) return null

  const clone = mini.clone(true)

  const assembly = clone.getObjectByName(ASSEMBLY_GROUP_NAME)
  if (assembly) {
    for (const child of [...clone.children]) {
      if (child !== assembly) clone.remove(child)
    }
  }

  pruneBreadboardNodes(clone)
  return clone
}

function pruneBreadboardNodes(root: Object3D) {
  const toRemove: Object3D[] = []
  root.traverse((obj) => {
    if (isBreadboardNode(obj.name)) toRemove.push(obj)
  })
  for (const obj of toRemove) {
    obj.parent?.remove(obj)
  }
}

function extractBlowUpParts(deviceRoot: Object3D): Object3D[] {
  const assembly = deviceRoot.getObjectByName(ASSEMBLY_GROUP_NAME)
  if (!assembly) return [...deviceRoot.children]

  const parts: Object3D[] = []
  for (const layer of assembly.children) {
    if (isBreadboardNode(layer.name)) continue
    parts.push(...layer.children)
  }

  return parts.length > 0 ? parts : [...assembly.children]
}

/** Move direct children so the mesh centroid sits at the root origin. */
function centerAtOrigin(root: Object3D) {
  root.updateMatrixWorld(true)
  const center = new Box3().setFromObject(root).getCenter(new Vector3())
  const localCenter = root.worldToLocal(center.clone())

  for (const child of root.children) {
    child.position.sub(localCenter)
  }
}

/** Uniformly scale so max bounding-box dimension = 1. */
function scaleToUnit(root: Object3D) {
  root.updateMatrixWorld(true)
  const size = new Box3().setFromObject(root).getSize(new Vector3())
  const maxDimension = Math.max(size.x, size.y, size.z, 1e-6)
  const scale = 1 / maxDimension

  for (const child of root.children) {
    child.position.multiplyScalar(scale)
    child.scale.multiplyScalar(scale)
  }
}

/**
 * Extract, dedupe, center centroid at origin, and scale to unit size.
 * Runs once when the GLB finishes loading — before any rendering or animation.
 */
export function prepareModelFromGltf(gltfScene: Object3D): PreparedModel | null {
  const device = extractDeviceRoot(gltfScene)
  if (!device) return null

  const root = new Group()
  root.name = 'hero-model-root'
  root.add(device)

  centerAtOrigin(root)
  scaleToUnit(root)

  const parts = extractBlowUpParts(device).map((object) => ({
    object,
    basePosition: object.position.clone(),
  }))

  return { root, parts }
}

export function applyBlowUpSpread(
  parts: ModelPart[],
  blowUp: number,
  spread: number,
) {
  const centerIndex = (parts.length - 1) / 2 + 0.5

  for (let i = 0; i < parts.length; i += 1) {
    const { object, basePosition } = parts[i]
    object.position.y = basePosition.y + (i - centerIndex) * spread * blowUp
  }
}
