const ISOMETRIC_DISTANCE = 6

export const ISOMETRIC_CAMERA_POSITION: [number, number, number] = [
  ISOMETRIC_DISTANCE,
  ISOMETRIC_DISTANCE,
  ISOMETRIC_DISTANCE,
]

export function zoomForViewport(
  viewportWidth: number,
  viewportHeight: number,
  fillRatio = 0.82,
) {
  const minEdge = Math.min(viewportWidth, viewportHeight)
  return (minEdge * fillRatio) / 2
}
