const GITHUB_URL_RE = /https:\/\/github\.com\/[^\s)>]+/g

export interface InlinePart {
  type: 'text' | 'bold'
  value: string
}

export interface ParsedReleaseNotes {
  items: string[]
  changelogUrl: string | null
}

export function extractChangelogUrl(body: string): string | null {
  const matches = body.match(GITHUB_URL_RE)
  if (!matches?.length) return null
  return matches.find((url) => url.includes('/compare/') || url.includes('/releases/')) ?? matches[0]
}

function isChangelogOnlyLine(line: string): boolean {
  const withoutUrl = line.replace(GITHUB_URL_RE, '').replace(/\*\*/g, '').trim()
  return /^full changelog:?$/i.test(withoutUrl) || withoutUrl.length === 0
}

export function parseReleaseNotes(body: string): ParsedReleaseNotes {
  const changelogUrl = extractChangelogUrl(body)
  const items: string[] = []

  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (isChangelogOnlyLine(trimmed)) continue

    const bullet = trimmed.match(/^[-*]\s+(.+)$/)
    if (bullet?.[1]) {
      items.push(bullet[1])
      continue
    }

    if (!trimmed.startsWith('http') && !GITHUB_URL_RE.test(trimmed)) {
      items.push(trimmed)
    }
  }

  if (items.length === 0 && !changelogUrl) {
    items.push('See the release notes for details.')
  }

  return { items, changelogUrl }
}

export function parseInlineMarkdown(text: string): InlinePart[] {
  const parts: InlinePart[] = []
  const re = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'bold', value: match[1] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', value: text })
  }

  return parts
}
