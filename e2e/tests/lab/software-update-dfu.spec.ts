/**
 * Software update DFU flow E2E tests — install, reboot, reconnect, verify, and disconnect handling.
 *
 * Prerequisites:
 *   cd ../protov && just run-mock
 *   npm run bundle:firmware
 */
import { expect, test } from '../../fixtures/lab-devices'
import {
  advanceToDownload,
  advanceToInstall,
  connectFwupDevice,
  prepareMockForReconnect,
  prepareMockForReconnectDefault,
  withSlowFirmwareDownloads,
} from '../../support/fwup-connect'
import { readBundledRelease } from '../../support/fwup-release'

const SERIAL = '550e8400'
const SLOT = 0
/** Default mock slot identity after APPL when control `load` is not used (see e2e/MOCK_FWUP_GAPS.md). */
const MOCK_DEFAULT_POST_REBOOT_FW = '1.0.0'

const release = readBundledRelease('A.1')

test.describe.configure({ mode: 'serial', timeout: 180_000 })

test.describe('Software update — standard DFU flow', () => {
  test.beforeEach(async ({ lab }) => {
    await lab.gotoDevices()
    await lab.setEngineeringView()
  })

  test('completes download, install, reboot, reconnect, and verify', async ({
    lab,
    fwup,
    mockControl,
  }) => {
    await advanceToInstall(lab, fwup, mockControl)
    await fwup.waitForTransferProgress()
    await fwup.waitForReconnectStep()

    await prepareMockForReconnect(mockControl, SLOT, {
      serial: SERIAL,
      fwVersion: release.version,
      hwVersion: 'A.1',
    })
    await fwup.clickPrimary('Select device')
    await fwup.expectVerifySuccess(release.version)
    await fwup.clickPrimary('Complete')
    await fwup.expectClosed()
  })

  test('reports increasing bytes transferred during install', async ({ lab, fwup, mockControl }) => {
    await advanceToInstall(lab, fwup, mockControl)
    await fwup.waitForTransferProgress()
    await fwup.expectTransferBytesIncrease()
  })
})

test.describe('Software update — reboot and reconnect', () => {
  test.beforeEach(async ({ lab }) => {
    await lab.gotoDevices()
    await lab.setEngineeringView()
  })

  test('shows reboot notification and advances to reconnect after apply', async ({
    lab,
    fwup,
    mockControl,
  }) => {
    await advanceToInstall(lab, fwup, mockControl)
    await fwup.waitForTransferProgress()
    await fwup.waitForRebootOrReconnect()
    await lab.expectNotification('Device rebooting', 'USB link lost')
    await fwup.waitForReconnectStep()
    await expect(fwup.footerStatus()).toContainText('Device rebooted — press Select device to reconnect.')
  })

  test('reconnects and confirms the installed version', async ({ lab, fwup, mockControl }) => {
    await advanceToInstall(lab, fwup, mockControl)
    await fwup.waitForTransferProgress()
    await fwup.waitForReconnectStep()

    await prepareMockForReconnect(mockControl, SLOT, {
      serial: SERIAL,
      fwVersion: release.version,
      hwVersion: 'A.1',
    })
    await fwup.clickPrimary('Select device')
    await fwup.expectVerifySuccess(release.version)
  })

  test.skip('surfaces reboot timeout when the device never disconnects', async () => {
    // Blocked: mock always disconnects ~2s after APPL; needs fwup_skip_reboot / stay_connected (MOCK_FWUP_GAPS #2–3).
  })

  test('warns before leaving during reboot or reconnect', async ({ lab, fwup, mockControl }) => {
    await advanceToInstall(lab, fwup, mockControl)
    await fwup.waitForTransferProgress()
    await fwup.waitForRebootOrReconnect()

    const waitingReboot = await fwup.primaryButton('Waiting for reboot…').isVisible()
    if (waitingReboot) {
      await fwup.dismissMain('escape')
      await fwup.expectGuardDialog({
        title: 'Leave before reconnect?',
        body: /device is rebooting after install/,
        stayLabel: 'Stay and wait',
        leaveLabel: 'Close anyway',
      })
      await fwup.stayOnGuard()
      await fwup.waitForRebootOrReconnect()
      return
    }

    // Mock reboot is ~2s — if we missed the brief wait window, cover the reconnect guard instead.
    await fwup.waitForReconnectStep()
    await fwup.dismissMain('escape')
    await fwup.expectGuardDialog({
      title: 'Leave before reconnect?',
      body: /select the device in the port picker/,
      stayLabel: 'Stay and reconnect',
      leaveLabel: 'Close anyway',
    })
    await fwup.stayOnGuard()
    await fwup.waitForActiveStep('Reconnect')
  })
})

test.describe('Software update — version verification', () => {
  test.beforeEach(async ({ lab }) => {
    await lab.gotoDevices()
    await lab.setEngineeringView()
  })

  test('shows Close after a post-reboot version mismatch', async ({ lab, fwup, mockControl }) => {
    await advanceToInstall(lab, fwup, mockControl)
    await fwup.waitForTransferProgress()
    await fwup.waitForReconnectStep()

    // Intentionally omit prepareMockForReconnect — slot 0 default profile reports fw 1.0.0 after APPL.
    await prepareMockForReconnectDefault(mockControl, SLOT)
    await fwup.clickPrimary('Select device')
    await fwup.expectVersionMismatch(release.version, MOCK_DEFAULT_POST_REBOOT_FW)
  })
})

test.describe('Software update — port disconnect', () => {
  test.beforeEach(async ({ lab }) => {
    await lab.gotoDevices()
    await lab.setEngineeringView()
  })

  test('during release check keeps the modal open after link loss', async ({
    page,
    lab,
    fwup,
    mockControl,
  }) => {
    await page.route('**/firmware/release.json', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 8_000))
      await route.continue()
    })

    try {
      await connectFwupDevice(lab, mockControl, { stateFile: 'fwup-eligible.json' })
      await lab.openFirmwareUpdate(SERIAL)
      await fwup.expectOpen()
      await expect(fwup.activeStep('check').getByText('Checking releases…')).toBeVisible()

      await lab.forceBridgeConnectionLost()
      await lab.expectNotification('Device rebooting', 'USB link lost')
      await fwup.expectOpen()
      await expect(fwup.primaryButton('Continue')).toBeDisabled()

      await expect
        .poll(async () => {
          const footer = await fwup.footerStatus().textContent()
          const stepText = await fwup.activeStep('check').textContent()
          return (
            /disconnected|not connected|failed|error/i.test(footer ?? '') ||
            /disconnected|not connected|failed|error/i.test(stepText ?? '') ||
            (footer?.includes('Waiting for release check') ?? false)
          )
        }, { timeout: 30_000 })
        .toBe(true)
    } finally {
      await page.unroute('**/firmware/release.json')
    }
  })

  test('during download shows link-lost notification while finishing download', async ({
    page,
    lab,
    fwup,
    mockControl,
  }) => {
    await withSlowFirmwareDownloads(page, 12_000, async () => {
      await advanceToDownload(lab, fwup, mockControl)
      await fwup.waitForDownloading()
      await lab.forceBridgeConnectionLost()
      await lab.expectNotification('Device rebooting', 'USB link lost')
      await fwup.waitForDownloadComplete()
    })

    await fwup.expectOpen()
    await expect(fwup.primaryButton('Install update')).toBeEnabled()
  })

  test('during firmware transfer shows install error and Close', async ({ lab, fwup, mockControl }) => {
    await advanceToInstall(lab, fwup, mockControl)
    await fwup.waitForTransferProgress()
    await lab.forceBridgeConnectionLost()
    await fwup.expectInstallFailed(/failed|closed|disconnect|error/i)
    await fwup.expectOpen()
  })

  test('during reconnect step keeps the modal open when the device is offline', async ({
    lab,
    fwup,
    mockControl,
  }) => {
    await advanceToInstall(lab, fwup, mockControl)
    await fwup.waitForTransferProgress()
    await fwup.waitForReconnectStep()

    // After APPL the USB link is already gone — there is no bridge socket left to force-close.
    await fwup.expectOpen()
    await expect(fwup.primaryButton('Select device')).toBeEnabled()
    await expect(fwup.footerStatus()).toContainText('Device rebooted — press Select device to reconnect.')
  })
})

test.describe('Software update — verify without control preset', () => {
  test.skip('happy-path verify without presetPostRebootIdentity', async () => {
    // Blocked: mock resets to 1.0.0 after APPL (MOCK_FWUP_GAPS #1).
  })
})
