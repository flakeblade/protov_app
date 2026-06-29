import type { LabPage } from '../pages/lab.page'
import type { MockControlClient } from './mock-control'

export interface ConnectMockOptions {
  slot?: number
  stateFile?: string
  deviceCount?: number
}

/** Reset slots, optionally preload state, and connect one or more mock devices. */
export async function connectMockDevices(
  lab: LabPage,
  mockControl: MockControlClient,
  options: ConnectMockOptions = {},
) {
  const { slot = 0, stateFile, deviceCount = 1 } = options

  await lab.gotoDevices()
  await lab.setEngineeringView()
  await mockControl.resetAllSlots()
  await mockControl.releaseAllSlots()
  await mockControl.waitForFreeSlots(deviceCount)

  for (let index = 0; index < deviceCount; index += 1) {
    await mockControl.waitForFreeSlots(1)
    if (stateFile && index === slot) {
      await mockControl.loadStateFile(index, stateFile)
    } else if (index !== slot || !stateFile) {
      await mockControl.resetSlot(index)
    }
    await lab.clickConnect()
    await lab.expectDeviceCount(index + 1)

    if (stateFile && index === slot) {
      const snapshot = await mockControl.channelSnapshot(index, 'CH1')
      if (snapshot.output) {
        await mockControl.waitForChannelOutput(index, 'CH1', true)
      }
    }
  }
}
