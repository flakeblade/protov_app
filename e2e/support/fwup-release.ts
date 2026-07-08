import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseReleaseNotes } from '../../src/lab/firmware/release-notes'

export interface BundledReleaseInfo {
  version: string
  packageName: string
  packageSizeLabel: string
  signatureName: string
  buildDate: string
  releaseNoteItems: string[]
  changelogUrl: string | null
}

const MANIFEST_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/release.json',
)

function formatBytes(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`
  }
  return `${size} B`
}

function formatBuildDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function readBundledRelease(hwRevision = 'A.1'): BundledReleaseInfo {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as {
    version: string
    body: string
    publishedAt: string
    bundledAt?: string
    assets: Array<{ name: string; size: number }>
  }
  const packageName = `protov-${manifest.version}-${hwRevision}.bin`
  const signatureName = `protov-${manifest.version}-${hwRevision}.sign.bin`
  const firmware = manifest.assets.find((asset) => asset.name === packageName)
  if (!firmware) {
    throw new Error(`Bundled manifest missing asset ${packageName}`)
  }
  const notes = parseReleaseNotes(manifest.body)
  return {
    version: manifest.version,
    packageName,
    packageSizeLabel: formatBytes(firmware.size),
    signatureName,
    buildDate: formatBuildDate(manifest.bundledAt ?? manifest.publishedAt),
    releaseNoteItems: notes.items,
    changelogUrl: notes.changelogUrl,
  }
}
