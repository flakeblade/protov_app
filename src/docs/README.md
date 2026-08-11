# Documentation rendering

ProtoV App docs are **not** authored in this folder as MDX. They are:

1. Bundled from [flakeblade/protov/docs](https://github.com/flakeblade/protov/tree/mini/docs) into `public/docs/content/` and `public/docs/res/`.
2. Mapped for navigation via [`docs-config.json`](./docs-config.json).
3. Rendered at runtime with [`MarkdownRenderer.tsx`](./MarkdownRenderer.tsx) (`react-markdown`).

## Key modules

| File | Role |
| --- | --- |
| `docs-config.json` | Slug, title, category, description, `sourceFile` mapping |
| `docsConfig.ts` | Types, helpers, `validDocSlugs`, GitHub source URLs |
| `docsApi.ts` | Fetch manifest + markdown from `/docs/*` |
| `useDocsConfig.tsx` | React context (manifest loading) |
| `DocViewer.tsx` | Page shell: title, markdown body, source footer |
| `MarkdownRenderer.tsx` | `remark-gfm` + `remark-github-blockquote-alert`, Mantine components |
| `markdownLinks.ts` | Rewrite `.md` links, `res/` images, `../` repo paths |

## Adding a doc page

1. Ensure the markdown exists upstream (or after `npm run bundle:docs`).
2. Add an entry to `docs-config.json`.
3. Copy config to `public/docs/docs-config.json` (happens automatically on `prebuild`).

## Link & image rules

- `other_doc.md` → `/docs/{slug}` using `sourceFile` map
- `res/foo.png` → `/docs/res/foo.png`
- `../scripts/foo.py` → GitHub blob URL at bundled commit
- `https://…` → external link

## GitHub alerts

Blockquotes like `> [!IMPORTANT]` are parsed by `remark-github-blockquote-alert` and styled via [`markdownAlerts.css`](./markdownAlerts.css); plain blockquotes use Mantine `Blockquote`.

See also [`public/docs/README.md`](../../public/docs/README.md) for bundling workflow.
