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
    guide: ReactNode
    reference: ReactNode
    troubleshooting: ReactNode
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
    {
      id: 'getting-started',
      label: 'Getting started with ProtoV MINI',
      description: 'Set up your bench supply and connect over USB-C',
      docType: 'Guide',
      keywords: ['setup', 'start', 'usb-c', 'breadboard'],
      icon: icons.guide,
      onClick: () => go('/docs'),
    },
    {
      id: 'hardware-specs',
      label: 'Hardware specifications',
      description: 'Voltage, current, headers, and physical dimensions',
      docType: 'Docs',
      keywords: ['specs', '20v', '5a', 'headers', 'dimensions'],
      icon: icons.reference,
      onClick: () => go('/docs'),
    },
    {
      id: 'usb-pd',
      label: 'USB-C power delivery',
      description: '100 W PD input and channel power budgeting',
      docType: 'Docs',
      keywords: ['usb', 'pd', 'power', '100w', 'type-c'],
      icon: icons.reference,
      onClick: () => go('/docs'),
    },
    {
      id: 'lab-interface',
      label: 'Online lab interface',
      description: 'Control channels, limits, and live measurements',
      docType: 'Guide',
      keywords: ['telemetry', 'controls', 'channels', 'web'],
      icon: icons.guide,
      onClick: () => go('/lab'),
    },
    {
      id: 'device-not-detected',
      label: 'Device not detected',
      description: 'Troubleshoot USB connection and driver issues',
      docType: 'Troubleshooting',
      keywords: ['usb', 'connection', 'driver', 'detect', 'cable'],
      icon: icons.troubleshooting,
      onClick: () => go('/docs'),
    },
    {
      id: 'channel-calibration',
      label: 'Channel calibration',
      description: 'Verify readings and recover from limit faults',
      docType: 'Troubleshooting',
      keywords: ['calibration', 'limits', 'fault', 'measurement', 'accuracy'],
      icon: icons.troubleshooting,
      onClick: () => go('/docs'),
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
