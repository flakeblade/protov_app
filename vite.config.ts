import { copyFileSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import rehypeHighlight from 'rehype-highlight'

const appRoot = dirname(fileURLToPath(import.meta.url))
const appVersion = (JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf8')) as { version: string })
  .version
const buildYear = String(new Date().getFullYear())

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_YEAR__: JSON.stringify(buildYear),
  },
  plugins: [
    mdx({
      remarkPlugins: [remarkGfm, remarkFrontmatter],
      rehypePlugins: [rehypeHighlight],
    }),
    react(),
    {
      name: 'gh-pages-spa-fallback',
      closeBundle() {
        if (command !== 'build') return
        const indexPath = resolve('dist/index.html')
        copyFileSync(indexPath, resolve('dist/404.html'))
      },
    },
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
}))
