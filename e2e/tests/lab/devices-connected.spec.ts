/**
 * Devices page E2E tests with a connected Rust mock backend.
 *
 * Prerequisites:
 *   Terminal 1 — cd /home/tianyi/src/protov && just run-mock
 *   Terminal 2 — npm run dev (Playwright starts this automatically)
 *
 * Override URLs with PROTOV_MOCK_CTRL_WS / PROTOV_MOCK_SCPI_WS / VITE_PROTOV_MOCK_WS.
 */
import { expect, test } from '../../fixtures/lab-devices'
import { MOCK_SLOT_PROFILES } from '../../support/mock-profiles'

test.describe.configure({ mode: 'serial' })

test.describe('Lab devices page (connected mock)', () => {
  test.beforeEach(async ({ lab }) => {
    await lab.gotoDevices()
    await lab.setEngineeringView()
  })

  test('connect adds a device with correct state and controls', async ({ lab, mockControl }) => {
    await mockControl.loadStateFile(0, 'ch1-active.json')
    await lab.clickConnect()

    await lab.expectDeviceCount(1)
    await lab.expectDeviceCard({
      serial: '550e8400',
      fw: '1.2.3',
      hw: 'A.1',
      channels: [
        {
          id: 'A',
          active: true,
          voltage: '3.298',
          current: '0.243',
          color: 'red',
        },
        {
          id: 'B',
          active: false,
          voltage: '5.000',
          current: '2.000',
          color: 'blue',
        },
      ],
    })
  })

  test('disconnect removes a device', async ({ lab, mockControl }) => {
    await mockControl.resetSlot(0)
    await lab.clickConnect()
    await lab.expectDeviceCount(1)

    await lab.clickDisconnect('550e8400')
    await lab.expectDeviceCount(0)
    await lab.expectDevicesEmptyState()
  })

  test('adds up to four devices', async ({ lab, mockControl }) => {
    await mockControl.resetAllSlots()

    for (let index = 0; index < 4; index += 1) {
      await lab.clickConnect()
      await lab.expectDeviceCount(index + 1)
    }

    await lab.expectDeviceCardOrder(MOCK_SLOT_PROFILES.map((profile) => profile.serial))
    await lab.expectConnectDisabled()
  })

  test('reconnect moves a device to the end of the list', async ({ lab, mockControl }) => {
    await mockControl.resetAllSlots()
    await lab.clickConnect()
    await lab.clickConnect()
    await lab.expectDeviceCardOrder(['550e8400', '32983fe4'])

    await lab.clickDisconnect('550e8400')
    await lab.expectDeviceCardOrder(['32983fe4'])

    await lab.clickConnect()
    await lab.expectDeviceCardOrder(['32983fe4', '550e8400'])
  })

  test('channel buttons activate and deactivate outputs', async ({ lab, mockControl }) => {
    await mockControl.resetSlot(0)
    await lab.clickConnect()

    await lab.toggleChannel('550e8400', 'A')
    await lab.expectChannelOutputActive('550e8400', 'A', true)

    await lab.toggleChannel('550e8400', 'A')
    await lab.expectChannelOutputActive('550e8400', 'A', false)
  })

  test('Go to controls navigates to the controls page', async ({ lab, mockControl, page }) => {
    await mockControl.resetSlot(0)
    await lab.clickConnect()

    await lab.clickGoToControls('550e8400')
    await expect(page.getByText('Voltage').first()).toBeVisible()
    await expect(page.getByText('Channel A').first()).toBeVisible()
  })
})
