import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type LabView = 'standard' | 'engineering'

const STORAGE_KEY = 'protov-lab-view'

interface LabViewContextValue {
  view: LabView
  setView: (view: LabView) => void
  isEngineering: boolean
}

const LabViewContext = createContext<LabViewContextValue | null>(null)

function readStoredView(): LabView {
  if (typeof window === 'undefined') return 'standard'
  return localStorage.getItem(STORAGE_KEY) === 'engineering' ? 'engineering' : 'standard'
}

export function LabViewProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<LabView>(readStoredView)

  const setView = (next: LabView) => {
    setViewState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  const value = useMemo(
    () => ({
      view,
      setView,
      isEngineering: view === 'engineering',
    }),
    [view],
  )

  return <LabViewContext.Provider value={value}>{children}</LabViewContext.Provider>
}

export function useLabView() {
  const context = useContext(LabViewContext)
  if (!context) {
    throw new Error('useLabView must be used within LabViewProvider')
  }
  return context
}

/** Routes only available in engineering view */
export const ENGINEERING_ONLY_PATHS = ['/lab/telemetry'] as const

export function isPathAllowedInView(pathname: string, view: LabView) {
  if (view === 'engineering') return true
  return !ENGINEERING_ONLY_PATHS.some((path) => pathname.startsWith(path))
}
