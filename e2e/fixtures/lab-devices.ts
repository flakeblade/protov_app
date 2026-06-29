import { test as base } from './test-base'
import { MockControlClient, MOCK_SCPI_WS, mockControl } from '../support/mock-control'

type LabDevicesFixtures = {
  mockControl: MockControlClient
}

export const test = base.extend<LabDevicesFixtures>({
  page: async ({ page }, use) => {
    const bridgeMarker = MOCK_SCPI_WS.replace(/^wss?:\/\//, '')
    await page.addInitScript((marker: string) => {
      const registry: WebSocket[] = []
      ;(window as Window & { __protovBridgeSockets?: WebSocket[] }).__protovBridgeSockets =
        registry

      const OriginalWebSocket = WebSocket
      function TrackedWebSocket(url: string | URL, protocols?: string | string[]) {
        const socket =
          protocols === undefined
            ? new OriginalWebSocket(url)
            : new OriginalWebSocket(url, protocols)
        const href = typeof url === 'string' ? url : url.href
        if (href.includes(marker)) {
          registry.push(socket)
        }
        return socket
      }
      TrackedWebSocket.prototype = OriginalWebSocket.prototype
      Object.assign(TrackedWebSocket, OriginalWebSocket)
      window.WebSocket = TrackedWebSocket as unknown as typeof WebSocket
    }, bridgeMarker)

    await use(page)
  },

  mockControl: async ({ lab }, use) => {
    const cleanup = async () => {
      try {
        await lab.forceCloseBridgeSockets()
        await lab.gotoDevices()
        await lab.disconnectAllDevices()
      } catch {
        // Best-effort UI cleanup; still release mock slots below.
      }
      try {
        await mockControl.releaseAllSlots()
      } catch {
        await mockControl.resetAllSlots()
      }
      await mockControl.waitForFreeSlots(4)
    }

    await mockControl.ping()
    await cleanup()
    await use(mockControl)
    await cleanup()
  },
})

export { expect } from '@playwright/test'
