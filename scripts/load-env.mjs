import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Load `.env` from the repo root when present (does not override existing env vars). */
export function loadLocalEnv() {
  const envPath = join(appRoot, '.env')
  if (!existsSync(envPath)) {
    return
  }

  const content = readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separator = trimmed.indexOf('=')
    if (separator === -1) {
      continue
    }

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

/** GitHub PAT for bundle scripts. Prefer AUTH_TOKEN; fall back to GITHUB_TOKEN. */
export function getGitHubAuthToken() {
  return process.env.AUTH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim() || ''
}

export function githubAuthHeaders(userAgent) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': userAgent,
  }
  const token = getGitHubAuthToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

loadLocalEnv()
