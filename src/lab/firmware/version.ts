/** Compare dotted numeric version strings (e.g. 1.7.2 vs 1.0.0). Returns -1, 0, or 1. */
export function compareVersions(left: string, right: string): number {
  const a = left.replace(/^v/i, '').split('.').map((part) => Number.parseInt(part, 10) || 0)
  const b = right.replace(/^v/i, '').split('.').map((part) => Number.parseInt(part, 10) || 0)
  const length = Math.max(a.length, b.length)

  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }
  return 0
}

export function normalizeVersionTag(tag: string): string {
  return tag.replace(/^v/i, '')
}
