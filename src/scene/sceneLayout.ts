import { zoomForViewport } from './sceneCamera'

const CONTAINER_MAX = 1320
const NAVBAR_HEIGHT = 60
const CONTAINER_PADDING = 16
const GRID_GAP = 24
const MOBILE_BREAKPOINT = 768

export interface HeroViewportLayout {
  zoomViewportWidth: number
  zoomViewportHeight: number
  offsetX: number
}

/**
 * Keeps the model at the same on-screen position/size as the old right-column canvas
 * while the WebGL surface covers the full viewport.
 */
export function heroViewportLayout(
  viewportWidth: number,
  viewportHeight: number,
): HeroViewportLayout {
  if (viewportWidth < MOBILE_BREAKPOINT) {
    const canvasHeight = Math.max(viewportHeight * 0.42, 280)
    return {
      zoomViewportWidth: viewportWidth,
      zoomViewportHeight: canvasHeight,
      offsetX: 0,
    }
  }

  const containerWidth = Math.min(viewportWidth, CONTAINER_MAX)
  const containerLeft = (viewportWidth - containerWidth) / 2
  const contentWidth = containerWidth - CONTAINER_PADDING * 2
  const col1Width = (5 / 12) * (contentWidth - GRID_GAP)
  const col2Width = (7 / 12) * (contentWidth - GRID_GAP)
  const rightColCenterX =
    containerLeft + CONTAINER_PADDING + col1Width + GRID_GAP + col2Width / 2
  const canvasHeight = viewportHeight - NAVBAR_HEIGHT
  const pixelOffsetX = rightColCenterX - viewportWidth / 2
  const zoom = zoomForViewport(col2Width, canvasHeight)

  return {
    zoomViewportWidth: col2Width,
    zoomViewportHeight: canvasHeight,
    offsetX: pixelOffsetX / zoom,
  }
}
