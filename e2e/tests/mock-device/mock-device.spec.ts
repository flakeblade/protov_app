import { test, expect } from '../../fixtures/mock-device'

test.describe('Mock SCPI device', () => {
  test('starts and exposes a serial port', async ({ mockDevice }) => {
    expect(mockDevice.clientPort).toMatch(/^\/dev\/(pts\/\d+|tty\w+|tmp\/)/)
  })

  test('loads preset state via control socket', async ({ mockDevice }) => {
    const result = await mockDevice.loadState('ch1-active.yaml')
    expect(result).toMatch(/^OK loaded/)

    const status = await mockDevice.status()
    const channels = status.channels as Record<
      string,
      { output: boolean; measured: { current: number } }
    >
    expect(channels.CH1.output).toBe(true)
    expect(channels.CH1.measured.current).toBeGreaterThan(0.22)
    expect(channels.CH1.measured.current).toBeLessThan(0.27)
  })
})
