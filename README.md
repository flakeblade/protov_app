# ProtoV App

Vite + React + TypeScript frontend with Mantine UI and Three.js (React Three Fiber) for fast 3D rendering. Built as a static site for deployment via GitHub Pages.

## Stack

- **Vite** — dev server and production bundler
- **React 19** + **TypeScript**
- **Mantine** — component library and theming
- **Three.js** via **@react-three/fiber** and **@react-three/drei** — WebGL 3D scene

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
```

Output is written to `dist/` as static assets.

Preview the production build locally:

```bash
npm run preview
```

## Deploy to GitHub Pages

The Vite `base` path is set to `/protov_app/` for production builds to match the repository name.

```bash
npm run deploy
```

This runs `npm run build` then publishes `dist/` to the `gh-pages` branch.

Ensure GitHub Pages is configured to deploy from the `gh-pages` branch (Settings → Pages → Deploy from branch).

Live URL: [https://flakeblade.github.io/protov_app/](https://flakeblade.github.io/protov_app/)

## Project structure

```
src/
  components/
    Scene3D.tsx   # Three.js canvas (lazy-loaded)
  App.tsx         # Mantine AppShell layout
  main.tsx        # MantineProvider + app entry
```

Extend `Scene3D.tsx` with models, shaders, and post-processing as your 3D needs grow.
