import { defineConfig, devices } from '@playwright/test'

const PORT = 5173
const HOST = '127.0.0.1'
const BASE_URL = `http://${HOST}:${PORT}`

const CONNECTED_MOCK_TESTS = [
  '**/devices-connected.spec.ts',
  '**/controls-connected.spec.ts',
  '**/graphs-connected.spec.ts',
  '**/telemetry-connected.spec.ts',
] as const

const generalBrowserProjects = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  {
    name: 'msedge',
    use: { ...devices['Desktop Edge'], channel: 'msedge' },
  },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
] as const

const WEBKIT_TESTS = ['**/webkit.spec.ts'] as const

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    ...generalBrowserProjects.map((project) => ({
      name: project.name,
      testIgnore: [...CONNECTED_MOCK_TESTS, ...WEBKIT_TESTS],
      use: project.use,
    })),
    {
      name: 'webkit',
      testMatch: [...WEBKIT_TESTS],
      testIgnore: [...CONNECTED_MOCK_TESTS],
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'chromium-devices-mock',
      testMatch: [...CONNECTED_MOCK_TESTS],
      fullyParallel: false,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --host ${HOST} --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_PROTOV_MOCK_WS: process.env.VITE_PROTOV_MOCK_WS ?? 'ws://127.0.0.1:8765',
    },
  },
})
