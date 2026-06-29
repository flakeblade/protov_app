import { test as base } from './test-base'
import { MockControlClient, mockControl } from '../support/mock-control'

type LabDevicesFixtures = {
  mockControl: MockControlClient
}

export const test = base.extend<LabDevicesFixtures>({
  mockControl: async ({ lab }, use) => {
    await mockControl.ping()

    const cleanup = async () => {
      await lab.gotoDevices()
      await lab.disconnectAllDevices()
      await mockControl.resetAllSlots()
    }

    await cleanup()
    await use(mockControl)
    await cleanup()
  },
})

export { expect } from '@playwright/test'
