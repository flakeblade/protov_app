import { DOCS_ASSETS_BASE } from './docsConfig'

const MARKDOWN_LINK = /^([^#]+\.md)(#.*)?$/
const REPO_RELATIVE = /^\.\.\//

export function resolveMarkdownHref(
  href: string | undefined,
  sourceFileSlugMap: ReadonlyMap<string, string>,
  sourceCommit: string,
  sourceRepo: string,
): string | undefined {
  if (!href) return href

  if (/^https?:\/\//i.test(href) || href.startsWith('mailto:')) {
    return href
  }

  if (href.startsWith('/')) {
    return href
  }

  if (href.startsWith('res/')) {
    return `${DOCS_ASSETS_BASE}/${href.slice('res/'.length)}`
  }

  if (REPO_RELATIVE.test(href)) {
    const repoPath = href.replace(/^\.\.\//, '')
    return `https://github.com/${sourceRepo}/blob/${sourceCommit}/${repoPath}`
  }

  const markdownMatch = href.match(MARKDOWN_LINK)
  if (markdownMatch) {
    const [, file, hash = ''] = markdownMatch
    const slug = sourceFileSlugMap.get(file)
    if (slug) {
      return slug === 'index' ? `/docs${hash}` : `/docs/${slug}${hash}`
    }
  }

  return href
}

export function resolveMarkdownImageSrc(src: string | undefined): string | undefined {
  if (!src) return src
  if (/^https?:\/\//i.test(src) || src.startsWith('/')) {
    return src
  }
  if (src.startsWith('res/')) {
    return `${DOCS_ASSETS_BASE}/${src.slice('res/'.length)}`
  }
  return src
}

export function stripLeadingTitle(markdown: string, title: string): string {
  const lines = markdown.split('\n')
  const firstHeadingIndex = lines.findIndex((line) => line.startsWith('# '))
  if (firstHeadingIndex === -1) return markdown

  const headingText = lines[firstHeadingIndex]!.slice(2).trim()
  if (headingText.toLowerCase() !== title.toLowerCase()) {
    return markdown
  }

  const nextLines = lines.slice(firstHeadingIndex + 1)
  while (nextLines.length > 0 && nextLines[0]?.trim() === '') {
    nextLines.shift()
  }
  return nextLines.join('\n')
}
