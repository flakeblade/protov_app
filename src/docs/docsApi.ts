import type { DocsBundleManifest } from './docsConfig'
import { DOCS_CONTENT_BASE, DOCS_MANIFEST_URL } from './docsConfig'

let manifestPromise: Promise<DocsBundleManifest> | null = null
const markdownCache = new Map<string, string>()

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`)
  }
  return response.json() as Promise<T>
}

export function fetchDocsManifest(): Promise<DocsBundleManifest> {
  manifestPromise ??= fetchJson<DocsBundleManifest>(DOCS_MANIFEST_URL)
  return manifestPromise
}

export async function fetchDocMarkdown(sourceFile: string): Promise<string> {
  const cached = markdownCache.get(sourceFile)
  if (cached) return cached

  const response = await fetch(`${DOCS_CONTENT_BASE}/${sourceFile}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch markdown ${sourceFile} (${response.status})`)
  }
  const markdown = await response.text()
  markdownCache.set(sourceFile, markdown)
  return markdown
}

export function resetDocsCacheForTests() {
  manifestPromise = null
  markdownCache.clear()
}
