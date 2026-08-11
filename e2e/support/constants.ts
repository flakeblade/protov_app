/** Shared route paths for e2e tests (app base URL is `/` in dev). */

export const routes = {
  home: '/',
  lab: {
    root: '/lab',
    devices: '/lab/devices',
    controls: '/lab/controls',
    graphs: '/lab/graphs',
    telemetry: '/lab/telemetry',
  },
  docs: {
    root: '/docs',
    quickStart: '/docs/quick-start',
    hardware: '/docs/hardware',
  },
} as const

export const labViewStorageKey = 'protov-lab-view'
