# Bundled documentation assets

Documentation **content** is fetched from the upstream [flakeblade/protov](https://github.com/flakeblade/protov) repository. This app renders that markdown in the `/docs` UI.

## What lives here

| Path | Committed | Purpose |
| --- | --- | --- |
| `docs-config.json` (copied from `src/docs/docs-config.json`) | Yes | Navigation, search metadata, slug → markdown file mapping |
| `content/*.md` | No (generated) | Bundled markdown from protov `docs/` |
| `res/**` | No (generated) | Images referenced by bundled markdown |
| `bundle-manifest.json` | No (generated) | Upstream commit SHA, ref, and file list |

## Bundle docs

```bash
npm run bundle:docs
```

This downloads markdown and `docs/res/**` from the **default branch** of `flakeblade/protov` (currently `mini`). Override the ref with:

```bash
DOCS_REF=mini GITHUB_TOKEN=... npm run bundle:docs
```

`GITHUB_TOKEN` is optional but recommended to avoid GitHub API rate limits.

## After bundling

1. Open `bundle-manifest.json` and note any new `content/*.md` files.
2. Edit [`src/docs/docs-config.json`](../src/docs/docs-config.json):
   - Add a `slug`, `sourceFile`, `title`, `category`, `description`, and `type` for each new page.
   - Choose URL slugs in kebab-case (for example `quick_start.md` → `quick-start`).
3. Copy the config to public (or run `prebuild` / `npm run build`):
   ```bash
   mkdir -p public/docs && cp src/docs/docs-config.json public/docs/docs-config.json
   ```
4. Verify pages locally at `/docs` and `/docs/{slug}`.

## Source of truth

- **Markdown & images:** [github.com/flakeblade/protov/tree/mini/docs](https://github.com/flakeblade/protov/tree/mini/docs)
- **Site navigation metadata:** `src/docs/docs-config.json` in this repository

Each rendered page links to the exact upstream markdown commit shown in `bundle-manifest.json`.
