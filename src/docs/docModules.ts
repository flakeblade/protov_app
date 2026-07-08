import type { ComponentType } from 'react'
import type { MDXProps } from 'mdx/types'

type MdxModule = { default: ComponentType<MDXProps> }

export const docModules: Record<string, () => Promise<MdxModule>> = {
  index: () => import('./index.mdx'),
  'getting-started': () => import('./getting-started.mdx'),
  'firmware-update': () => import('./firmware-update.mdx'),
  hardware: () => import('./hardware.mdx'),
  power: () => import('./power.mdx'),
  'lab-interface': () => import('./lab-interface.mdx'),
  troubleshooting: () => import('./troubleshooting.mdx'),
  reference: () => import('./reference.mdx'),
}

export const validDocSlugs = new Set(Object.keys(docModules))

export function resolveDocSlug(slug?: string): string {
  if (!slug || !validDocSlugs.has(slug)) {
    return 'index'
  }

  return slug
}
