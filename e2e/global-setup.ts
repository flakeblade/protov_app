import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_MANIFEST = path.join(E2E_DIR, 'fixtures', 'release.json')
const PUBLIC_FIRMWARE_ROOT = path.join(E2E_DIR, '../public/firmware')

/** Stage the committed E2E release manifest and placeholder assets for the dev server. */
export default function globalSetup() {
  const manifestDest = path.join(PUBLIC_FIRMWARE_ROOT, 'release.json')
  if (fs.existsSync(manifestDest)) {
    return
  }

  const manifest = JSON.parse(fs.readFileSync(FIXTURE_MANIFEST, 'utf8')) as {
    assets: Array<{ name: string; url: string; size: number }>
  }

  fs.mkdirSync(PUBLIC_FIRMWARE_ROOT, { recursive: true })
  fs.copyFileSync(FIXTURE_MANIFEST, manifestDest)

  for (const asset of manifest.assets) {
    const relativePath = asset.url.replace(/^\//, '')
    const filePath = path.join(E2E_DIR, '../public', relativePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, Buffer.alloc(asset.size))
  }
}
