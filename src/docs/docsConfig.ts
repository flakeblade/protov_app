export type DocType = 'guide' | 'reference' | 'troubleshooting'

export interface DocConfigEntry {
  slug: string
  title: string
  category: string
  description: string
  type: DocType
}

export const docsConfig: DocConfigEntry[] = [
  {
    slug: 'index',
    title: 'Overview',
    category: 'Overview',
    description: 'Introduction to ProtoV MINI documentation and product capabilities.',
    type: 'guide',
  },
  {
    slug: 'getting-started',
    title: 'Getting Started',
    category: 'Getting Started',
    description: 'Unbox, connect, and bring your ProtoV MINI online for the first time.',
    type: 'guide',
  },
  {
    slug: 'firmware-update',
    title: 'Firmware Update',
    category: 'Getting Started',
    description: 'Update firmware in the lab or manually on devices below v1.6.',
    type: 'guide',
  },
  {
    slug: 'hardware',
    title: 'Hardware',
    category: 'Hardware',
    description: 'Headers, dimensions, connectors, and physical layout of the board.',
    type: 'reference',
  },
  {
    slug: 'power',
    title: 'Power',
    category: 'Power',
    description: 'USB-C PD input, channel limits, and safe operating envelopes.',
    type: 'reference',
  },
  {
    slug: 'lab-interface',
    title: 'Lab Interface',
    category: 'Lab Interface',
    description: 'Use the web lab to control rails, limits, and live measurements.',
    type: 'guide',
  },
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting',
    category: 'Troubleshooting',
    description: 'Resolve connection issues, faults, and unexpected measurement behavior.',
    type: 'troubleshooting',
  },
  {
    slug: 'reference',
    title: 'Reference',
    category: 'Reference',
    description: 'Command reference, telemetry fields, and integration notes.',
    type: 'reference',
  },
]

export function getDocsByCategory(): { category: string; docs: DocConfigEntry[] }[] {
  const categories = new Map<string, DocConfigEntry[]>()

  for (const doc of docsConfig) {
    const existing = categories.get(doc.category) ?? []
    existing.push(doc)
    categories.set(doc.category, existing)
  }

  return Array.from(categories.entries()).map(([category, docs]) => ({
    category,
    docs,
  }))
}

export function getDocPath(slug: string): string {
  return slug === 'index' ? '/docs' : `/docs/${slug}`
}
