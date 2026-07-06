/**
 * UI sync when mock hardware setpoints change while a device stays connected.
 *
 * Prerequisites:
 *   Terminal 1 — cd /home/tianyi/src/protov && just run-mock
 *   Terminal 2 — npm run dev (Playwright starts this automatically)
 */
import { test } from '../../fixtures/lab-devices'
import { connectMockDevices } from '../../support/lab-connect'
import {
  INITIAL_CH1_SETPOINTS,
  UPDATED_CH1_SETPOINTS,
  applyUpdatedHardwareSetpoints,
} from '../../support/hardware-setpoints'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test.describe('Lab hardware setpoint sync', () => {
  test('devices page channel chips reflect hardware setpoint changes', async ({
    lab,
    mockControl,
  }) => {
    await connectMockDevices(lab, mockControl, { stateFile: 'default.json' })

    await lab.expectChannelState('550e8400', 'A', {
      active: false,
      voltage: INITIAL_CH1_SETPOINTS.voltage,
      current: INITIAL_CH1_SETPOINTS.current,
      color: 'red',
    })

    await applyUpdatedHardwareSetpoints(mockControl)

    await lab.expectChannelReadings('550e8400', 'A', {
      voltage: UPDATED_CH1_SETPOINTS.voltage,
      current: UPDATED_CH1_SETPOINTS.current,
    })
  })

  test('controls page inputs reflect hardware changes without enabling Apply', async ({
    lab,
    controls,
    mockControl,
  }) => {
    await connectMockDevices(lab, mockControl, { stateFile: 'default.json' })
    await lab.openControls()

    const channelA = controls.channelCard('A')
    await controls.expectApplyEnabled(channelA, false)
    await controls.expectSetpointValue(channelA, 'Voltage', 'SET', INITIAL_CH1_SETPOINTS.voltage)
    await controls.expectSetpointValue(channelA, 'Current', 'SET', INITIAL_CH1_SETPOINTS.current)
    await controls.expectSetpointValue(channelA, 'Voltage', 'OVP', INITIAL_CH1_SETPOINTS.ovp)
    await controls.expectSetpointValue(channelA, 'Current', 'OCP', INITIAL_CH1_SETPOINTS.ocp)

    await applyUpdatedHardwareSetpoints(mockControl)

    await controls.expectSetpointValue(channelA, 'Voltage', 'SET', UPDATED_CH1_SETPOINTS.voltage)
    await controls.expectSetpointValue(channelA, 'Current', 'SET', UPDATED_CH1_SETPOINTS.current)
    await controls.expectSetpointValue(channelA, 'Voltage', 'OVP', UPDATED_CH1_SETPOINTS.ovp)
    await controls.expectSetpointValue(channelA, 'Current', 'OCP', UPDATED_CH1_SETPOINTS.ocp)
    await controls.expectApplyEnabled(channelA, false)
  })

  test('graphs page setpoint header reflects hardware changes', async ({
    lab,
    graphs,
    mockControl,
  }) => {
    await connectMockDevices(lab, mockControl, { stateFile: 'default.json' })
    await lab.openGraphs()

    const channelA = graphs.graphChannelCard('A')
    await graphs.expectChannelSetpoints(
      channelA,
      INITIAL_CH1_SETPOINTS.voltage,
      INITIAL_CH1_SETPOINTS.current,
    )

    await applyUpdatedHardwareSetpoints(mockControl)

    await graphs.expectChannelSetpoints(
      channelA,
      UPDATED_CH1_SETPOINTS.voltage,
      UPDATED_CH1_SETPOINTS.current,
    )
  })
})
