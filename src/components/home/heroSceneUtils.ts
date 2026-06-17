import { Box3, Group, Object3D, Vector3 } from 'three'

const ISOMETRIC_DISTANCE = 6

/** Standard 45° isometric camera position (equal angles onto origin). */
export const ISOMETRIC_CAMERA_POSITION: [number, number, number] = [
  ISOMETRIC_DISTANCE,
  ISOMETRIC_DISTANCE,
  ISOMETRIC_DISTANCE,
]

export function isBreadboardNode(name: string) {
  return name.toLowerCase().startsWith('breadboard')
}

/** Keep only the product device; drop breadboard roots from packed scene.glb. */
export function extractDeviceRoot(scene: Object3D): Object3D | null {
  const device = scene.children.find((child) => {
    const name = child.name.toLowerCase()
    return name.includes('protov') || name.includes('mini')
  })

  if (!device) return null

  const clone = device.clone(true)
  pruneBreadboardNodes(clone)
  return clone
}

export function pruneBreadboardNodes(root: Object3D) {
  const toRemove: Object3D[] = []
  root.traverse((obj) => {
    if (isBreadboardNode(obj.name)) toRemove.push(obj)
  })
  for (const obj of toRemove) {
    obj.parent?.remove(obj)
  }
}

export interface NormalizedModel {
  object: Group
  maxDimension: number
}

/** Center at origin and scale so max dimension = 1 (unit-agnostic). */
export function normalizeModel(object: Object3D): NormalizedModel {
  const wrapper = new Group()
  wrapper.add(object)

  const box = new Box3().setFromObject(wrapper)
  const center = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3())
  const maxDimension = Math.max(size.x, size.y, size.z, 1e-6)

  wrapper.position.copy(center.multiplyScalar(-1))
  wrapper.scale.setScalar(1 / maxDimension)

  return { object: wrapper, maxDimension: 1 }
}

/** Orthographic zoom so a unit-sized model fills `fillRatio` of the viewport min edge. */
export function zoomForViewport(
  viewportWidth: number,
  viewportHeight: number,
  fillRatio = 0.82,
) {
  const minEdge = Math.min(viewportWidth, viewportHeight)
  return (minEdge * fillRatio) / 2
}
