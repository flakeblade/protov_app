import Fuse, { type IFuseOptions } from 'fuse.js'
import type { HomeSpotlightEntry } from './homeSpotlightEntries'

const fuseOptions: IFuseOptions<HomeSpotlightEntry> = {
  keys: ['label', 'description', 'docType', 'keywords'],
  threshold: 0.35,
  minMatchCharLength: 1,
}

export function filterSpotlightEntries(
  query: string,
  entries: HomeSpotlightEntry[],
): HomeSpotlightEntry[] {
  const trimmed = query.trim()
  if (!trimmed) {
    return entries
  }

  const fuse = new Fuse(entries, fuseOptions)
  return fuse.search(trimmed).map((result) => result.item)
}
