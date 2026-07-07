import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { persistDocsPath, persistLabPath } from '../navigation/sectionReturnPath'

export type AppSection = 'lab' | 'docs'

export function usePersistSectionPath(section: AppSection): void {
  const { pathname } = useLocation()

  useEffect(() => {
    if (section === 'lab') {
      persistLabPath(pathname)
      return
    }
    persistDocsPath(pathname)
  }, [section, pathname])
}
