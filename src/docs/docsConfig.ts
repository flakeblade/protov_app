import docsConfigJson from './docs-config.json'

export type DocType = 'guide' | 'reference' | 'troubleshooting'

export interface DocConfigEntry {
  slug: string
  sourceFile: string
  title: string
  category: string
  description: string
  type: DocType
}

export interface DocsConfigFile {
  docs: DocConfigEntry[]
}

export interface DocsBundleManifest {
  sourceRepo: string
  sourceRef: string
  sourceCommit: string
  bundledAt: string
  files: string[]
}

export const DOCS_CONFIG_URL = '/docs/docs-config.json'
export const DOCS_MANIFEST_URL = '/docs/bundle-manifest.json'
export const DOCS_CONTENT_BASE = '/docs/content'
export const DOCS_ASSETS_BASE = '/docs/res'

export function getDocPath(slug: string): string {
  return slug === 'index' ? '/docs' : `/docs/${slug}`
}

export function getDocsByCategory(docs: readonly DocConfigEntry[]): {
  category: string
  docs: DocConfigEntry[]
}[] {
  const categories = new Map<string, DocConfigEntry[]>()

  for (const doc of docs) {
    const existing = categories.get(doc.category) ?? []
    existing.push(doc)
    categories.set(doc.category, existing)
  }

  return Array.from(categories.entries()).map(([category, entries]) => ({
    category,
    docs: entries,
  }))
}

export function buildSourceFileSlugMap(docs: readonly DocConfigEntry[]): Map<string, string> {
  return new Map(docs.map((doc) => [doc.sourceFile, doc.slug]))
}

export function resolveDocSlug(slug: string | undefined, validSlugs: ReadonlySet<string>): string {
  if (!slug || !validSlugs.has(slug)) {
    return 'index'
  }
  return slug
}

export function getGitHubSourceUrl(
  manifest: DocsBundleManifest,
  sourceFile: string,
): string {
  return `https://github.com/${manifest.sourceRepo}/blob/${manifest.sourceCommit}/docs/${sourceFile}`
}

export const bundledDocsConfig = docsConfigJson as DocsConfigFile

export const docsConfig = bundledDocsConfig.docs

export const validDocSlugs = new Set(docsConfig.map((doc) => doc.slug))
