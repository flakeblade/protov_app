import { compareVersions } from './version'
import { parseReleaseNotes } from './release-notes'

export interface FirmwareReleaseAsset {
  name: string
  /** Same-origin path under public/firmware (bundled at build time). */
  url: string
  size: number
}

export interface FirmwareRelease {
  tag: string
  version: string
  name: string
  body: string
  publishedAt: string
  bundledAt?: string
  assets: FirmwareReleaseAsset[]
}

export interface FirmwarePackage {
  release: FirmwareRelease
  firmware: FirmwareReleaseAsset
  signature: FirmwareReleaseAsset
}

const MANIFEST_URL = '/firmware/release.json'

function parseReleaseNotesFromBody(body: string): string[] {
  return parseReleaseNotes(body).items
}

export function releaseNotesList(release: FirmwareRelease): string[] {
  const fromBody = parseReleaseNotesFromBody(release.body)
  if (fromBody.length > 0) return fromBody
  if (release.body.trim()) {
    return [release.body.trim()]
  }
  return ['See the GitHub release page for details.']
}

export function selectFirmwarePackage(
  release: FirmwareRelease,
  hwRevision: string,
): FirmwarePackage | null {
  const version = release.version
  const firmwareName = `protov-${version}-${hwRevision}.bin`
  const signatureName = `protov-${version}-${hwRevision}.sign.bin`
  const firmware = release.assets.find((asset) => asset.name === firmwareName)
  const signature = release.assets.find((asset) => asset.name === signatureName)
  if (!firmware || !signature) return null
  return { release, firmware, signature }
}

export function isUpdateAvailable(currentVersion: string, releaseVersion: string): boolean {
  return compareVersions(releaseVersion, currentVersion) > 0
}

export async function fetchLatestRelease(): Promise<FirmwareRelease> {
  const response = await fetch(MANIFEST_URL)
  if (!response.ok) {
    throw new Error(
      `Bundled firmware manifest missing (${response.status}). Run npm run bundle:firmware before building or starting dev.`,
    )
  }
  return (await response.json()) as FirmwareRelease
}

export async function downloadReleaseAsset(
  asset: FirmwareReleaseAsset,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const response = await fetch(asset.url, { signal })
  if (!response.ok) {
    throw new Error(`Failed to download ${asset.name} (${response.status})`)
  }

  const total = asset.size || Number(response.headers.get('content-length') ?? 0)
  if (!response.body) {
    const buffer = await response.arrayBuffer()
    onProgress?.(buffer.byteLength, total || buffer.byteLength)
    return new Uint8Array(buffer)
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    chunks.push(value)
    loaded += value.length
    onProgress?.(loaded, total || loaded)
  }

  const out = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  onProgress?.(loaded, total || loaded)
  return out
}

export function formatBytes(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`
  }
  return `${size} B`
}
