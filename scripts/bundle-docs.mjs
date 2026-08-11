import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = 'flakeblade/protov'
const DOCS_PREFIX = 'docs/'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const appRoot = join(scriptDir, '..')
const docsRoot = join(appRoot, 'public', 'docs')
const contentRoot = join(docsRoot, 'content')
const resRoot = join(docsRoot, 'res')

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'protov-app-bundle-docs',
  }
  const token = process.env.GITHUB_TOKEN?.trim()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: githubHeaders() })
  if (!response.ok) {
    throw new Error(`GitHub API ${url} failed (${response.status})`)
  }
  return response.json()
}

async function resolveRef(ref) {
  if (ref) {
    const branch = await fetchJson(`https://api.github.com/repos/${REPO}/branches/${encodeURIComponent(ref)}`)
    return {
      ref,
      commit: branch.commit.sha,
    }
  }

  const repo = await fetchJson(`https://api.github.com/repos/${REPO}`)
  const defaultRef = repo.default_branch
  const branch = await fetchJson(
    `https://api.github.com/repos/${REPO}/branches/${encodeURIComponent(defaultRef)}`,
  )
  return {
    ref: defaultRef,
    commit: branch.commit.sha,
  }
}

async function fetchDocsTree(commitSha) {
  const tree = await fetchJson(
    `https://api.github.com/repos/${REPO}/git/trees/${commitSha}?recursive=1`,
  )
  return tree.tree.filter(
    (entry) =>
      entry.type === 'blob' &&
      entry.path.startsWith(DOCS_PREFIX) &&
      !entry.path.endsWith('.gitignore'),
  )
}

async function downloadBlob(path, commitSha) {
  const response = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${commitSha}`,
    { headers: githubHeaders() },
  )
  if (!response.ok) {
    throw new Error(`Failed to download ${path} (${response.status})`)
  }
  const payload = await response.json()
  if (payload.encoding === 'base64' && payload.content) {
    return Buffer.from(payload.content.replace(/\n/g, ''), 'base64')
  }
  if (payload.download_url) {
    const assetResponse = await fetch(payload.download_url, { headers: githubHeaders() })
    if (!assetResponse.ok) {
      throw new Error(`Failed to download ${path} from ${payload.download_url} (${assetResponse.status})`)
    }
    return Buffer.from(await assetResponse.arrayBuffer())
  }
  throw new Error(`Unexpected content payload for ${path}`)
}

function outputPathForTreeEntry(path) {
  const relative = path.slice(DOCS_PREFIX.length)
  if (relative.endsWith('.md')) {
    return join(contentRoot, relative)
  }
  if (relative.startsWith('res/')) {
    return join(resRoot, relative.slice('res/'.length))
  }
  return null
}

function manifestPathForOutput(filePath) {
  const relative = filePath.slice(docsRoot.length + 1).replaceAll('\\', '/')
  return relative
}

async function main() {
  const refInput = process.env.DOCS_REF?.trim()
  const { ref, commit } = await resolveRef(refInput)

  await rm(contentRoot, { recursive: true, force: true })
  await rm(resRoot, { recursive: true, force: true })
  await mkdir(contentRoot, { recursive: true })
  await mkdir(resRoot, { recursive: true })

  const entries = await fetchDocsTree(commit)
  const markdownFiles = entries.filter((entry) => entry.path.endsWith('.md'))
  const assetFiles = entries.filter((entry) => !entry.path.endsWith('.md'))

  if (markdownFiles.length === 0) {
    throw new Error(`No markdown files found under ${DOCS_PREFIX} at ${ref}`)
  }

  const bundledFiles = []

  for (const entry of [...markdownFiles, ...assetFiles]) {
    const outputPath = outputPathForTreeEntry(entry.path)
    if (!outputPath) continue

    const bytes = await downloadBlob(entry.path, commit)
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, bytes)
    bundledFiles.push(manifestPathForOutput(outputPath))
    console.log(`bundled ${entry.path} (${bytes.length} bytes)`)
  }

  bundledFiles.sort()

  const manifest = {
    sourceRepo: REPO,
    sourceRef: ref,
    sourceCommit: commit,
    bundledAt: new Date().toISOString(),
    files: bundledFiles,
  }

  await writeFile(join(docsRoot, 'bundle-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`wrote public/docs/bundle-manifest.json (${commit.slice(0, 7)} on ${ref})`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
