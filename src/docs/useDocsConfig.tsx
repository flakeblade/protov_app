import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { fetchDocsManifest } from './docsApi'
import type { DocConfigEntry, DocsBundleManifest } from './docsConfig'
import { docsConfig, getDocsByCategory } from './docsConfig'

interface DocsConfigContextValue {
  docs: readonly DocConfigEntry[]
  manifest: DocsBundleManifest | null
  groupedDocs: ReturnType<typeof getDocsByCategory>
  validSlugs: ReadonlySet<string>
  loading: boolean
  error: string | null
}

const DocsConfigContext = createContext<DocsConfigContextValue | null>(null)

export function DocsConfigProvider({ children }: { children: ReactNode }) {
  const [manifest, setManifest] = useState<DocsBundleManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const bundleManifest = await fetchDocsManifest()
        if (cancelled) return
        setManifest(bundleManifest)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load docs bundle manifest')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<DocsConfigContextValue>(() => {
    const validSlugs = new Set(docsConfig.map((doc) => doc.slug))
    return {
      docs: docsConfig,
      manifest,
      groupedDocs: getDocsByCategory(docsConfig),
      validSlugs,
      loading,
      error,
    }
  }, [manifest, loading, error])

  return <DocsConfigContext.Provider value={value}>{children}</DocsConfigContext.Provider>
}

export function useDocsConfigContext(): DocsConfigContextValue {
  const value = useContext(DocsConfigContext)
  if (!value) {
    throw new Error('useDocsConfigContext must be used within DocsConfigProvider')
  }
  return value
}
