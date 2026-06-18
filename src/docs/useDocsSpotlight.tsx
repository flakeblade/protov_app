import { useMemo } from 'react'
import {
  IconFileText,
  IconLifebuoy,
  IconMap,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { spotlight } from '@mantine/spotlight'
import type { HomeSpotlightDocType, HomeSpotlightEntry } from '../components/home/homeSpotlightEntries'
import { docTypeBadgeColor } from '../components/home/homeSpotlightEntries'
import { docsConfig, getDocPath, type DocConfigEntry } from './docsConfig'

const ICON_SIZE = 22

function docTypeLabel(type: DocConfigEntry['type']): HomeSpotlightDocType {
  switch (type) {
    case 'guide':
      return 'Guide'
    case 'reference':
      return 'Docs'
    case 'troubleshooting':
      return 'Troubleshooting'
  }
}

function docTypeIcon(type: DocConfigEntry['type']) {
  switch (type) {
    case 'guide':
      return <IconMap size={ICON_SIZE} stroke={1.6} />
    case 'reference':
      return <IconFileText size={ICON_SIZE} stroke={1.6} />
    case 'troubleshooting':
      return <IconLifebuoy size={ICON_SIZE} stroke={1.6} />
  }
}

export interface DocsSpotlightGroup {
  group: string
  actions: HomeSpotlightEntry[]
}

export function useDocsSpotlight(): DocsSpotlightGroup[] {
  const navigate = useNavigate()

  return useMemo(() => {
    const groups = new Map<string, HomeSpotlightEntry[]>()

    for (const doc of docsConfig) {
      const entry: HomeSpotlightEntry = {
        id: `doc-${doc.slug}`,
        label: doc.title,
        description: doc.description,
        docType: docTypeLabel(doc.type),
        keywords: [doc.slug, doc.category, doc.type, doc.title, doc.description],
        icon: docTypeIcon(doc.type),
        onClick: () => {
          navigate(getDocPath(doc.slug))
          spotlight.close()
        },
      }

      const existing = groups.get(doc.category) ?? []
      existing.push(entry)
      groups.set(doc.category, existing)
    }

    return Array.from(groups.entries()).map(([group, actions]) => ({
      group,
      actions,
    }))
  }, [navigate])
}

export { docTypeBadgeColor }
