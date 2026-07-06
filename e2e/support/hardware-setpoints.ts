import { expect } from '@playwright/test'

import type { MockControlClient } from './mock-control'

/** Channel A (CH1) setpoints in default.json with output off. */
export const INITIAL_CH1_SETPOINTS = {
  voltage: '3.300',
  current: '0.500',
  ovp: '18.000',
  ocp: '1.000',
} as const

/** Channel A (CH1) setpoints in setpoints-updated.json. */
export const UPDATED_CH1_SETPOINTS = {
  voltage: '4.500',
  current: '1.250',
  ovp: '10.000',
  ocp: '2.500',
} as const

const UPDATED_CH1_NUMERIC = {
  voltage: 4.5,
  current: 1.25,
  ovp: 10,
  ocp: 2.5,
} as const

/** Simulate a hardware-side setpoint change via the mock control socket. */
export async function applyUpdatedHardwareSetpoints(
  mockControl: MockControlClient,
  slot = 0,
): Promise<void> {
  await mockControl.loadStateFile(slot, 'setpoints-updated.json')

  await expect
    .poll(async () => {
      const snapshot = await mockControl.channelSnapshot(slot, 'CH1')
      return (
        Math.abs(snapshot.voltage - UPDATED_CH1_NUMERIC.voltage) < 0.001 &&
        Math.abs(snapshot.current - UPDATED_CH1_NUMERIC.current) < 0.001 &&
        Math.abs(snapshot.ovp - UPDATED_CH1_NUMERIC.ovp) < 0.001 &&
        Math.abs(snapshot.ocp - UPDATED_CH1_NUMERIC.ocp) < 0.001
      )
    })
    .toBe(true)
}
