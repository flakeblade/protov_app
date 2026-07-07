import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = 'flakeblade/protov'
const scriptDir = dirname(fileURLToPath(import.meta.url))
const appRoot = join(scriptDir, '..')
const firmwareRoot = join(appRoot, 'public', 'firmware')

function normalizeVersionTag(tag) {
  return tag.replace(/^v/i, '')
}

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'protov-app-bundle-firmware',
  }
  const token = process.env.GITHUB_TOKEN?.trim()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

function isFirmwareAssetName(name) {
  return /^protov-.+\.(sign\.)?bin$/.test(name)
}

async function fetchLatestRelease() {
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: githubHeaders(),
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch latest ${REPO} release (${response.status})`)
  }
  return response.json()
}

async function downloadAsset(asset) {
  const response = await fetch(
    `https://api.github.com/repos/${REPO}/releases/assets/${asset.id}`,
    {
      headers: {
        ...githubHeaders(),
        Accept: 'application/octet-stream',
      },
      redirect: 'follow',
    },
  )
  if (!response.ok) {
    throw new Error(`Failed to download ${asset.name} (${response.status})`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  const release = await fetchLatestRelease()
  const version = normalizeVersionTag(release.tag_name)
  const assetDir = join(firmwareRoot, version)

  await rm(firmwareRoot, { recursive: true, force: true })
  await mkdir(assetDir, { recursive: true })

  const firmwareAssets = release.assets.filter((asset) => isFirmwareAssetName(asset.name))
  if (firmwareAssets.length === 0) {
    throw new Error(`Latest release ${release.tag_name} has no protov firmware assets`)
  }

  const bundledAssets = []
  for (const asset of firmwareAssets) {
    const bytes = await downloadAsset(asset)
    const filePath = join(assetDir, asset.name)
    await writeFile(filePath, bytes)
    bundledAssets.push({
      name: asset.name,
      url: `/firmware/${version}/${asset.name}`,
      size: bytes.length,
    })
    console.log(`bundled ${asset.name} (${bytes.length} bytes)`)
  }

  const manifest = {
    tag: release.tag_name,
    version,
    name: release.name || release.tag_name,
    body: release.body ?? '',
    publishedAt: release.published_at,
    bundledAt: new Date().toISOString(),
    assets: bundledAssets,
  }

  await writeFile(join(firmwareRoot, 'release.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`wrote public/firmware/release.json for ${release.tag_name}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
