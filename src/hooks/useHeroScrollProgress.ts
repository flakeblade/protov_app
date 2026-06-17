import { useEffect, useState, type RefObject } from 'react'

/**
 * Raw scroll progress (0–1) through a scroll stage.
 * Uses native window scroll — no smoothing, no scroll hijacking.
 */
export function useScrollStageProgress(stageRef: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const element = stageRef.current
      if (!element) return

      const rect = element.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const scrollRange = Math.max(element.offsetHeight - viewportHeight, 1)
      const scrolled = -rect.top
      const next = Math.min(1, Math.max(0, scrolled / scrollRange))
      setProgress(next)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [stageRef])

  return progress
}

/** @deprecated Use useScrollStageProgress */
export const useHeroScrollProgress = useScrollStageProgress
