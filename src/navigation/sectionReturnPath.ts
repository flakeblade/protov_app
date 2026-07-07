import { validDocSlugs } from '../docs/docModules'

const LAB_PATH_KEY = 'protov-nav-lab-path'
const DOCS_PATH_KEY = 'protov-nav-docs-path'

const LAB_PAGES = new Set(['devices', 'controls', 'graphs', 'telemetry'])

export const DEFAULT_LAB_PATH = '/lab/devices'
export const DEFAULT_DOCS_PATH = '/docs'

function readStoredPath(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStoredPath(key: string, path: string): void {
  try {
    sessionStorage.setItem(key, path)
  } catch {
    // Ignore quota / private-mode errors.
  }
}

export function isValidLabPath(pathname: string): boolean {
  const match = pathname.match(/^\/lab\/([^/]+)$/)
  if (!match) {
    return false
  }
  return LAB_PAGES.has(match[1])
}

export function isValidDocsPath(pathname: string): boolean {
  if (pathname === '/docs') {
    return true
  }
  const match = pathname.match(/^\/docs\/([^/]+)$/)
  if (!match) {
    return false
  }
  return validDocSlugs.has(match[1])
}

export function getLabReturnPath(): string {
  const saved = readStoredPath(LAB_PATH_KEY)
  if (saved && isValidLabPath(saved)) {
    return saved
  }
  return DEFAULT_LAB_PATH
}

export function getDocsReturnPath(): string {
  const saved = readStoredPath(DOCS_PATH_KEY)
  if (saved && isValidDocsPath(saved)) {
    return saved
  }
  return DEFAULT_DOCS_PATH
}

export function persistLabPath(pathname: string): void {
  if (isValidLabPath(pathname)) {
    writeStoredPath(LAB_PATH_KEY, pathname)
  }
}

export function persistDocsPath(pathname: string): void {
  if (isValidDocsPath(pathname)) {
    writeStoredPath(DOCS_PATH_KEY, pathname)
  }
}
