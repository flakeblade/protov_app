# ProtoV App

Vite + React + TypeScript web frontend with Mantine UI. The lab device control UI (ported from the Tauri app) lives under `/lab/`. Built as a static site for GitHub Pages.

## Stack

- **Vite** — dev server and production bundler
- **React 19** + **TypeScript**
- **Mantine** — component library and theming
- **React Router** — client-side routing
- **Three.js** (via React Three Fiber) — available for future 3D views

## Routes

| Path | Description |
|------|-------------|
| `/` | Welcome page (placeholder) with links to Lab and Docs |
| `/lab/` | Device control UI — ported from the Tauri app |
| `/lab/devices` | Connected device cards |
| `/lab/controls` | Per-channel voltage/current controls |
| `/docs/` | Documentation placeholder |

## Development

```bash
npm install
npm run dev
```

- Home: [http://localhost:5173/](http://localhost:5173/)
- Lab: [http://localhost:5173/lab/](http://localhost:5173/lab/)

## Build

```bash
npm run build
```

Output is written to `dist/` as static assets. A `404.html` copy is generated for GitHub Pages SPA routing.

## Deploy to GitHub Pages

Production deploys run automatically when you push a version tag (`v*`), via `.github/workflows/pages.yml`.

```bash
git tag v1.0.0
git push origin v1.0.0
```

Manual deploy from a local build:

```bash
npm run deploy
```

Live URL: [https://protov.app/](https://protov.app/)

## Project structure

```
src/
  pages/
    HomePage.tsx       # Welcome placeholder
    DocsPage.tsx       # Docs placeholder
  lab/                 # Ported Tauri device control UI
    LabApp.tsx         # AppShell + collapsible sidebar
    navbar.tsx
    components/
    pages/
  components/
    Scene3D.tsx        # Three.js demo (unused, kept for later)
```
