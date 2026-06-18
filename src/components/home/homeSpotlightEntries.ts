import type { ReactNode } from 'react'

export type HomeSpotlightDocType = 'Guide' | 'Docs' | 'Troubleshooting' | 'App'

export interface HomeSpotlightEntry {
  id: string
  label: string
  description: string
  docType: HomeSpotlightDocType
  keywords?: string[]
  icon: ReactNode
  onClick: () => void
}

interface BuildHomeSpotlightEntriesOptions {
  navigate: (path: string) => void
  toggleColorScheme: () => void
  closeSpotlight: () => void
  icons: {
    lab: ReactNode
    docs: ReactNode
    home: ReactNode
    theme: ReactNode
  }
}

export function buildHomeSpotlightEntries({
  navigate,
  toggleColorScheme,
  closeSpotlight,
  icons,
}: BuildHomeSpotlightEntriesOptions): HomeSpotlightEntry[] {
  const go = (path: string) => {
    navigate(path)
    closeSpotlight()
  }

  const run = (action: () => void) => {
    action()
    closeSpotlight()
  }

  return [
    {
      id: 'open-lab',
      label: 'Open lab',
      description: 'Launch the online ProtoV lab interface',
      docType: 'App',
      keywords: ['lab', 'controls', 'power', 'interface'],
      icon: icons.lab,
      onClick: () => go('/lab'),
    },
    {
      id: 'open-docs',
      label: 'Open docs',
      description: 'Browse ProtoV MINI documentation',
      docType: 'App',
      keywords: ['docs', 'documentation', 'manual'],
      icon: icons.docs,
      onClick: () => go('/docs'),
    },
    {
      id: 'go-home',
      label: 'Go to homepage',
      description: 'Return to the ProtoV product landing page',
      docType: 'App',
      keywords: ['home', 'landing', 'protov', 'mini'],
      icon: icons.home,
      onClick: () => go('/'),
    },
    {
      id: 'toggle-theme',
      label: 'Toggle dark mode',
      description: 'Switch between light and dark color schemes',
      docType: 'App',
      keywords: ['theme', 'dark', 'light', 'appearance', 'mode'],
      icon: icons.theme,
      onClick: () => run(toggleColorScheme),
    },
  ]
}

export function docTypeBadgeColor(docType: HomeSpotlightDocType): string {
  switch (docType) {
    case 'Guide':
      return 'teal'
    case 'Docs':
      return 'gray'
    case 'Troubleshooting':
      return 'orange'
    case 'App':
      return 'violet'
  }
}
