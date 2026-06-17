import {
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Object3D,
} from 'three'

const EDGE_THRESHOLD = 10

export interface ModelColors {
  edge: string
  fill: string
}

export interface OutlineRenderer {
  edgeMaterials: LineBasicMaterial[]
  fillMaterials: MeshBasicMaterial[]
}

function collectMeshes(root: Object3D): Mesh[] {
  const meshes: Mesh[] = []
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (mesh.isMesh && mesh.geometry) meshes.push(mesh)
  })
  return meshes
}

/** One-time outline + fill setup on a prepared model root. */
export function installOutlineRenderer(root: Object3D, colors: ModelColors): OutlineRenderer {
  const edgeMaterials: LineBasicMaterial[] = []
  const fillMaterials: MeshBasicMaterial[] = []

  for (const mesh of collectMeshes(root)) {
    const fill = new MeshBasicMaterial({
      color: colors.fill,
      transparent: false,
      opacity: 1,
      depthWrite: true,
    })
    mesh.material = fill
    fillMaterials.push(fill)

    mesh.getObjectByName('__outline_edges__')?.removeFromParent()

    const edgeMat = new LineBasicMaterial({ color: colors.edge, depthTest: true })
    const edges = new LineSegments(
      new EdgesGeometry(mesh.geometry, EDGE_THRESHOLD),
      // mesh.geometry,
      edgeMat,
    )
    edges.name = '__outline_edges__'
    edges.renderOrder = 2
    mesh.add(edges)
    edgeMaterials.push(edgeMat)
  }

  return { edgeMaterials, fillMaterials }
}

export function updateModelColors(renderer: OutlineRenderer, colors: ModelColors) {
  for (const material of renderer.edgeMaterials) {
    material.color.set(colors.edge)
  }
  for (const material of renderer.fillMaterials) {
    material.color.set(colors.fill)
  }
}
