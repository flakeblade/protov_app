/**
 * Telemetry page E2E tests with a connected Rust mock backend.
 *
 * Prerequisites:
 *   Terminal 1 — cd /home/tianyi/src/protov && just run-mock
 *   Terminal 2 — npm run dev (Playwright starts this automatically)
 */
import { expect, test } from '../../fixtures/lab-devices'
import type { LabPage } from '../../pages/lab.page'
import type { TelemetryPage } from '../../pages/telemetry.page'
import type { MockControlClient } from '../../support/mock-control'

test.describe.configure({ mode: 'serial', timeout: 60_000 })

async function connectOnTelemetry(
  lab: LabPage,
  mockControl: MockControlClient,
  options: { slot?: number; stateFile?: string; deviceCount?: number } = {},
) {
  const { slot = 0, stateFile = 'default.json', deviceCount = 1 } = options

  await lab.gotoDevices()
  await lab.setEngineeringView()
  await mockControl.resetAllSlots()

  for (let index = 0; index < deviceCount; index += 1) {
    if (index === slot) {
      await mockControl.loadStateFile(index, stateFile)
    } else {
      await mockControl.resetSlot(index)
    }
    await lab.clickConnect()
  }

  await lab.openTelemetry()
}

test.describe('Lab telemetry page (layout and identity)', () => {
  test('shows one card per connected device with identity badges', async ({
    lab,
    telemetry,
    mockControl,
  }) => {
    await connectOnTelemetry(lab, mockControl, { deviceCount: 2 })

    await telemetry.expectDeviceCardCount(2)
    await telemetry.expectDeviceIdentity(telemetry.deviceCardBySerial('550e8400'), {
      serial: '550e8400',
      fw: '1.0.0',
      hw: 'A.1',
      portFragment: 'ProtoV Mock',
    })
    await telemetry.expectDeviceIdentity(telemetry.deviceCardBySerial('32983fe4'), {
      serial: '32983fe4',
      fw: '1.0.1',
      hw: 'B.2',
      portFragment: 'ProtoV Mock',
    })
  })
})

test.describe('Lab telemetry page (live readings)', () => {
  test('shows default temperature, input power, and healthy converter badges', async ({
    lab,
    telemetry,
    mockControl,
  }) => {
    await connectOnTelemetry(lab, mockControl)

    const card = telemetry.deviceCard()
    await telemetry.expectTemperature(card, 'Ch A', '28.0')
    await telemetry.expectTemperature(card, 'Ch B', '27.5')
    await telemetry.expectTemperature(card, 'MCU', '34.0')
    await telemetry.expectInputPower(card, '20.0', '0.3')
    await telemetry.expectHealthBadge(card, 'INA226', true)
    await telemetry.expectHealthBadge(card, 'TPS55289', true)
  })

  test('reflects protection faults in health badges after state change', async ({
    lab,
    telemetry,
    mockControl,
  }) => {
    await connectOnTelemetry(lab, mockControl)

    const card = telemetry.deviceCard()
    await telemetry.expectHealthBadge(card, 'INA226', true)

    await mockControl.loadStateFile(0, 'ovp-fault.json')
    await expect
      .poll(async () => {
        try {
          await telemetry.expectHealthBadge(card, 'INA226', false)
          return true
        } catch {
          return false
        }
      })
      .toBe(true)
    await telemetry.expectHealthBadge(card, 'TPS55289', false)
  })
})

test.describe('Lab telemetry page (display brightness)', () => {
  test('loads initial LCD and LED brightness from the device', async ({
    lab,
    telemetry,
    mockControl,
  }) => {
    await connectOnTelemetry(lab, mockControl, { stateFile: 'display-settings.json' })

    const card = telemetry.deviceCard()
    await telemetry.expectBrightnessLabels(card, 80, 160)
  })

  test('updates LCD and LED brightness on the mock device', async ({
    lab,
    telemetry,
    mockControl,
  }) => {
    await connectOnTelemetry(lab, mockControl, { stateFile: 'display-settings.json' })

    const card = telemetry.deviceCard()
    await telemetry.setLcdBrightness(card, 200)
    await telemetry.setLedBrightness(card, 64)

    await expect
      .poll(async () => {
        const settings = await mockControl.displaySettings(0)
        return settings.lcd === 200 && settings.led === 64
      })
      .toBe(true)
  })
})

test.describe('Lab telemetry page (register dumps and console)', () => {
  test('dumps INA226 and TPS55289 registers into the serial console', async ({
    lab,
    telemetry,
    mockControl,
  }) => {
    await connectOnTelemetry(lab, mockControl)

    const card = telemetry.deviceCard()
    await telemetry.clickRegisterDump(card, 'INA226', 'A')
    await telemetry.expectConsoleContains(card, 'INA226:REG? CHA')
    await telemetry.expectConsoleContains(card, /INA226 @ 0x41/)

    await telemetry.clickRegisterDump(card, 'TPS55289', 'B')
    await telemetry.expectConsoleContains(card, 'TPS55289:REG? CHB')
    await telemetry.expectConsoleContains(card, /TPS55289 @ 0x74/)
  })

  test('sends manual SCPI commands through the serial console', async ({
    lab,
    telemetry,
    mockControl,
  }) => {
    await connectOnTelemetry(lab, mockControl)

    const card = telemetry.deviceCard()
    await telemetry.expectConsoleLinkOpen(card)
    await telemetry.expectConsoleContains(card, /WebSocket SCPI bridge/)

    await telemetry.sendConsoleCommand(card, '*IDN?')
    await telemetry.expectConsoleContains(card, '> *IDN?')
    await telemetry.expectConsoleContains(card, 'FBRD Inc.,ProtoV MINI,550e8400')
  })
})
