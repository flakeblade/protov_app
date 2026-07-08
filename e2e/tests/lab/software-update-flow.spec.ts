/**
 * Software update flow E2E tests — preflight, up-to-date, and guarded dismiss.
 *
 * Prerequisites:
 *   cd ../protov && just run-mock
 *   npm run bundle:firmware
 */
import { expect, test } from '../../fixtures/lab-devices'
import {
  advanceToDownload,
  connectFwupDevice,
  openEligibleFirmwareUpdate,
  withSlowFirmwareDownloads,
} from '../../support/fwup-connect'
import { readBundledRelease } from '../../support/fwup-release'

const SERIAL = '550e8400'
const DISMISS_METHODS = ['escape', 'close', 'backdrop'] as const

const release = readBundledRelease('A.1')

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test.describe('Software update — preflight acknowledgement', () => {
  test.beforeEach(async ({ lab }) => {
    await lab.gotoDevices()
    await lab.setEngineeringView()
  })

  test('requires acknowledgement before download begins', async ({ lab, fwup, mockControl }) => {
    await openEligibleFirmwareUpdate(lab, fwup, mockControl)

    await fwup.clickPrimary('Continue')
    await fwup.expectPreflightWarning()
    await expect(fwup.preflightDialog().getByRole('button', { name: 'Continue update' })).toBeDisabled()

    await fwup.acknowledgePreflightAndContinue()
    await fwup.waitForActiveStep('Download')
  })

  test('returns to the check step when preflight is cancelled via Cancel', async ({
    lab,
    fwup,
    mockControl,
  }) => {
    await openEligibleFirmwareUpdate(lab, fwup, mockControl)
    await fwup.clickPrimary('Continue')
    await fwup.expectPreflightWarning()

    await fwup.cancelPreflightViaButton()
    await fwup.expectPreflightCancelledToCheck()
  })

  test('returns to the check step when preflight is dismissed via the dialog X', async ({
    lab,
    fwup,
    mockControl,
  }) => {
    await openEligibleFirmwareUpdate(lab, fwup, mockControl)
    await fwup.clickPrimary('Continue')
    await fwup.expectPreflightWarning()

    await fwup.cancelPreflightViaClose()
    await fwup.expectPreflightCancelledToCheck()
  })
})

test.describe('Software update — up to date', () => {
  test.beforeEach(async ({ lab }) => {
    await lab.gotoDevices()
    await lab.setEngineeringView()
  })

  test('shows up to date when device matches the bundled release', async ({
    lab,
    fwup,
    mockControl,
  }) => {
    await connectFwupDevice(lab, mockControl, { stateFile: 'fwup-up-to-date.json' })
    await lab.openFirmwareUpdate(SERIAL)
    await fwup.expectOpen()
    await fwup.expectUpToDateState(release.version)
    await expect(fwup.shell().getByText(/Device matches latest bundled release/)).toBeVisible()
  })

  test('check again leaves an already-latest device up to date', async ({ lab, fwup, mockControl }) => {
    await connectFwupDevice(lab, mockControl, { stateFile: 'fwup-up-to-date.json' })
    await lab.openFirmwareUpdate(SERIAL)
    await fwup.expectUpToDateState(release.version)

    await fwup.clickCheckAgain()
    await fwup.expectUpToDateState(release.version)
    await fwup.waitForActiveStep('Check')
    await expect(fwup.shell().getByText(/Update available/)).toHaveCount(0)
  })
})

test.describe('Software update — dismiss without guard', () => {
  test.beforeEach(async ({ lab }) => {
    await lab.gotoDevices()
    await lab.setEngineeringView()
  })

  for (const method of DISMISS_METHODS) {
    test(`closes immediately on up-to-date devices via ${method}`, async ({
      lab,
      fwup,
      mockControl,
    }) => {
      await connectFwupDevice(lab, mockControl, { stateFile: 'fwup-up-to-date.json' })
      await lab.openFirmwareUpdate(SERIAL)
      await fwup.waitForCheckOutcome('up-to-date')
      await fwup.expectDismissClosesImmediately(method)
    })

    test(`closes immediately on the check step when an update is available via ${method}`, async ({
      lab,
      fwup,
      mockControl,
    }) => {
      await openEligibleFirmwareUpdate(lab, fwup, mockControl)
      await fwup.expectDismissClosesImmediately(method)
    })
  }
})

test.describe('Software update — guarded dismiss', () => {
  test.beforeEach(async ({ lab }) => {
    await lab.gotoDevices()
    await lab.setEngineeringView()
  })

  const downloadGuard = {
    title: 'Cancel download?',
    body: /still downloading/,
    stayLabel: 'Keep downloading',
    leaveLabel: 'Cancel download',
  } as const

  for (const method of DISMISS_METHODS) {
    test(`warns during download and supports stay/leave via ${method}`, async ({
      page,
      lab,
      fwup,
      mockControl,
    }) => {
      await withSlowFirmwareDownloads(page, 12_000, async () => {
        await advanceToDownload(lab, fwup, mockControl)
        await fwup.waitForDownloading()
        await fwup.expectGuardedDismiss(method, downloadGuard)
      })
    })
  }
})
