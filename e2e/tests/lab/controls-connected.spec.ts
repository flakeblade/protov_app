/**
 * Controls page E2E tests with a connected Rust mock backend.
 *
 * Prerequisites:
 *   Terminal 1 — cd /home/tianyi/src/protov && just run-mock
 *   Terminal 2 — npm run dev (Playwright starts this automatically)
 */
import { expect, test } from '../../fixtures/lab-devices'
import type { ControlsPage } from '../../pages/controls.page'
import type { LabPage } from '../../pages/lab.page'
import type { MockControlClient } from '../../support/mock-control'

test.describe.configure({ mode: 'serial' })

async function connectOnControls(
  lab: LabPage,
  mockControl: MockControlClient,
  options: { slot?: number; stateFile?: string; deviceCount?: number } = {},
) {
  const { slot = 0, stateFile, deviceCount = 1 } = options

  await lab.gotoDevices()
  await lab.setEngineeringView()
  await mockControl.resetAllSlots()

  for (let index = 0; index < deviceCount; index += 1) {
    if (stateFile && index === slot) {
      await mockControl.loadStateFile(index, stateFile)
    } else {
      await mockControl.resetSlot(index)
    }
    await lab.clickConnect()
  }

  await lab.openControls()
}

test.describe('Lab controls page (readings and layout)', () => {
  test('live readings match mock measurements when output is on', async ({
    lab,
    controls,
    mockControl,
  }) => {
    await connectOnControls(lab, mockControl, { stateFile: 'ch1-active.json' })

    const channelA = controls.channelCard('A')
    await controls.expectOutputOn(channelA, 'A', true)
    await controls.expectReading(channelA, 'Voltage', '3.298')
    await controls.expectReading(channelA, 'Current', '0.243')
    await controls.expectReading(channelA, 'Power', '0.802')
  })

  test('channel card count matches connected devices', async ({ lab, controls, mockControl }) => {
    await connectOnControls(lab, mockControl, { deviceCount: 2 })
    await controls.expectChannelCardCount(4)
  })

  test('live readings update when output is toggled on', async ({
    lab,
    controls,
    mockControl,
  }) => {
    await connectOnControls(lab, mockControl, { stateFile: 'ch1-active.json' })

    const channelA = controls.channelCard('A')
    await controls.expectReading(channelA, 'Voltage', '3.298')

    await controls.toggleOutput(channelA, 'A')
    await controls.expectOutputOn(channelA, 'A', false)
    await controls.expectReading(channelA, 'Voltage', '0.000')
    await controls.expectReading(channelA, 'Current', '0.000')

    await controls.toggleOutput(channelA, 'A')
    await controls.expectOutputOn(channelA, 'A', true)
    await expect
      .poll(async () => {
        const row = channelA.locator('[class*="parameterRow"]').filter({ hasText: 'Voltage' })
        const text = await row.locator('[class*="readingValue"]').textContent()
        return text?.includes('3.298') ?? false
      })
      .toBe(true)
  })
})

test.describe('Lab controls page (output and modes)', () => {
  test('power switch disables output on the mock device', async ({
    lab,
    controls,
    mockControl,
  }) => {
    await connectOnControls(lab, mockControl, { stateFile: 'ch1-active.json' })

    const channelA = controls.channelCard('A')
    await controls.toggleOutput(channelA, 'A')
    await controls.expectOutputOn(channelA, 'A', false)

    await expect
      .poll(async () => {
        const snapshot = await mockControl.channelSnapshot(0, 'CH1')
        return snapshot.output === false
      })
      .toBe(true)
  })

  test('shows CV mode for an active voltage-regulated channel', async ({
    lab,
    controls,
    mockControl,
  }) => {
    await connectOnControls(lab, mockControl, { stateFile: 'ch1-active.json' })
    await controls.expectChannelMode(controls.channelCard('A'), 'CV')
  })

  test('shows CC mode when current limit is reached', async ({ lab, controls, mockControl }) => {
    await connectOnControls(lab, mockControl, { stateFile: 'cc-mode.json' })
    await controls.expectChannelMode(controls.channelCard('A'), 'CC')
  })
})

test.describe('Lab controls page (setpoints)', () => {
  test('setpoint edits enable Apply and commit changes to the mock device', async ({
    lab,
    controls,
    mockControl,
  }) => {
    await connectOnControls(lab, mockControl, { stateFile: 'default.json' })

    const channelA = controls.channelCard('A')
    await controls.expectApplyEnabled(channelA, false)

    await controls.fillSetpoint(channelA, 'Voltage', 'SET', '4.500')
    await controls.fillSetpoint(channelA, 'Current', 'SET', '1.250')
    await controls.fillSetpoint(channelA, 'Voltage', 'OVP', '10.000')
    await controls.fillSetpoint(channelA, 'Current', 'OCP', '2.500')
    await controls.expectApplyEnabled(channelA, true)

    await controls.clickApply(channelA)

    await expect
      .poll(async () => {
        const snapshot = await mockControl.channelSnapshot(0, 'CH1')
        return (
          Math.abs(snapshot.voltage - 4.5) < 0.001 &&
          Math.abs(snapshot.current - 1.25) < 0.001 &&
          Math.abs(snapshot.ovp - 10) < 0.001 &&
          Math.abs(snapshot.ocp - 2.5) < 0.001
        )
      })
      .toBe(true)

    await controls.expectSetpointValue(channelA, 'Voltage', 'SET', '4.500')
    await controls.expectSetpointValue(channelA, 'Current', 'SET', '1.250')
    await controls.expectApplyEnabled(channelA, false)
  })

  test('out-of-bounds setpoints show an error and disable Apply', async ({
    lab,
    controls,
    mockControl,
  }) => {
    await connectOnControls(lab, mockControl, { stateFile: 'default.json' })

    const channelA = controls.channelCard('A')

    await controls.fillSetpoint(channelA, 'Voltage', 'SET', '25')
    await controls.expectSetpointError(channelA, 'Voltage', 'SET', true)
    await controls.expectApplyEnabled(channelA, false)

    await controls.fillSetpoint(channelA, 'Voltage', 'SET', '0.100')
    await controls.expectSetpointError(channelA, 'Voltage', 'SET', true)
    await controls.expectApplyEnabled(channelA, false)

    await controls.fillSetpoint(channelA, 'Current', 'SET', '6')
    await controls.expectSetpointError(channelA, 'Current', 'SET', true)
    await controls.expectApplyEnabled(channelA, false)
  })
})

test.describe('Lab controls page (appearance)', () => {
  test('channel color can be changed from the color picker', async ({
    lab,
    controls,
    mockControl,
  }) => {
    await connectOnControls(lab, mockControl, { stateFile: 'default.json' })

    const channelA = controls.channelCard('A')
    const before = await mockControl.channelSnapshot(0, 'CH1')

    await controls.pickChannelColor(channelA, 'green')

    await expect
      .poll(async () => {
        const after = await mockControl.channelSnapshot(0, 'CH1')
        return after.color !== undefined && JSON.stringify(after.color) !== JSON.stringify(before.color)
      })
      .toBe(true)
  })
})

test.describe('Lab controls page (protection faults)', () => {
  async function expectProtectionFault(
    controls: ControlsPage,
    mockControl: MockControlClient,
    stateFile: string,
    mode: 'OVP' | 'OCP' | 'TEMP',
    notificationTitle: string,
    notificationMessage: string,
  ) {
    await mockControl.loadStateFile(0, stateFile)

    await expect
      .poll(async () => {
        const tag = controls.channelCard('A').locator('[class*="modeTag"]')
        const text = await tag.textContent()
        const className = await tag.getAttribute('class')
        return text === mode && (className?.includes('modeTagFault') ?? false)
      })
      .toBe(true)

    await controls.expectNotification(notificationTitle, notificationMessage)
  }

  test('OVP fault shows mode tag and notification', async ({ lab, controls, mockControl }) => {
    await connectOnControls(lab, mockControl, { stateFile: 'ch1-active.json' })
    await expectProtectionFault(
      controls,
      mockControl,
      'ovp-fault.json',
      'OVP',
      'Over-voltage protection — Channel A',
      'exceeded its voltage limit',
    )
  })

  test('OCP fault shows mode tag and notification', async ({ lab, controls, mockControl }) => {
    await connectOnControls(lab, mockControl, { stateFile: 'ch1-active.json' })
    await expectProtectionFault(
      controls,
      mockControl,
      'ocp-fault.json',
      'OCP',
      'Over-current protection — Channel A',
      'exceeded its current limit',
    )
  })

  test('TEMP fault shows mode tag and notification', async ({ lab, controls, mockControl }) => {
    await connectOnControls(lab, mockControl, { stateFile: 'ch1-active.json' })
    await expectProtectionFault(
      controls,
      mockControl,
      'temp-fault.json',
      'TEMP',
      'Over-temperature protection — Channel A',
      'shut down due to over-temperature',
    )
  })
})
