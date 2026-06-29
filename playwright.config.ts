import { defineConfig, devices } from '@playwright/test'

const PORT = 5173
const HOST = '127.0.0.1'
const BASE_URL = `http://${HOST}:${PORT}`

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
    {
      name: 'chromium',
      testIgnore: '**/devices-connected.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-devices-mock',
      testMatch: '**/devices-connected.spec.ts',
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
