import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.join(E2E_DIR, '..')
const FIXTURE_FIRMWARE_MANIFEST = path.join(E2E_DIR, 'fixtures', 'release.json')
const FIXTURE_DOCS_ROOT = path.join(E2E_DIR, 'fixtures', 'docs')
const PUBLIC_FIRMWARE_ROOT = path.join(REPO_ROOT, 'public/firmware')
const PUBLIC_DOCS_ROOT = path.join(REPO_ROOT, 'public/docs')

function copyDirectory(sourceDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name)
    const destPath = path.join(destDir, entry.name)
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destPath)
    } else {
      fs.copyFileSync(sourcePath, destPath)
    }
  }
}

function stageFirmwareFixtures() {
  const manifestDest = path.join(PUBLIC_FIRMWARE_ROOT, 'release.json')
  if (fs.existsSync(manifestDest)) {
    return
  }

  const manifest = JSON.parse(fs.readFileSync(FIXTURE_FIRMWARE_MANIFEST, 'utf8')) as {
    assets: Array<{ name: string; url: string; size: number }>
  }

  fs.mkdirSync(PUBLIC_FIRMWARE_ROOT, { recursive: true })
  fs.copyFileSync(FIXTURE_FIRMWARE_MANIFEST, manifestDest)

  for (const asset of manifest.assets) {
    const relativePath = asset.url.replace(/^\//, '')
    const filePath = path.join(REPO_ROOT, 'public', relativePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, Buffer.alloc(asset.size))
  }
}

function stageDocsFixtures() {
  const contentMarker = path.join(PUBLIC_DOCS_ROOT, 'content', 'product.md')
  if (fs.existsSync(contentMarker)) {
    return
  }

  fs.mkdirSync(PUBLIC_DOCS_ROOT, { recursive: true })
  copyDirectory(path.join(FIXTURE_DOCS_ROOT, 'content'), path.join(PUBLIC_DOCS_ROOT, 'content'))
  fs.copyFileSync(
    path.join(FIXTURE_DOCS_ROOT, 'bundle-manifest.json'),
    path.join(PUBLIC_DOCS_ROOT, 'bundle-manifest.json'),
  )
  fs.copyFileSync(
    path.join(REPO_ROOT, 'src/docs/docs-config.json'),
    path.join(PUBLIC_DOCS_ROOT, 'docs-config.json'),
  )
}

/** Stage committed E2E fixtures for firmware and docs when bundled assets are missing. */
export default function globalSetup() {
  stageFirmwareFixtures()
  stageDocsFixtures()
}
