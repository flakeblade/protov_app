/**
 * Software update (SCPI FWUP) check-phase E2E tests with the Rust mock backend.
 *
 * Prerequisites:
 *   cd ../protov && just run-mock
 *   npm run bundle:firmware
 */
import { expect, test } from '../../fixtures/lab-devices'
import { connectFwupDevice } from '../../support/fwup-connect'
import { readBundledRelease } from '../../support/fwup-release'

const SERIAL = '550e8400'
const HW_INCOMPATIBLE = 'B.2'
const HW_ELIGIBLE = 'A.1'

const release = readBundledRelease(HW_ELIGIBLE)

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test.describe('Software update — release check', () => {
  test.beforeEach(async ({ lab }) => {
    await lab.gotoDevices()
    await lab.setEngineeringView()
  })

  test('reports no signed build for unsupported hardware revisions', async ({
    lab,
    fwup,
    mockControl,
  }) => {
    await connectFwupDevice(lab, mockControl, { stateFile: 'fwup-incompatible-hw.json' })
    await lab.openFirmwareUpdate(SERIAL)
    await fwup.expectOpen()
    await fwup.expectIncompatibleHardware(HW_INCOMPATIBLE)
    await fwup.expectDetails({
      serial: SERIAL,
      hardware: HW_INCOMPATIBLE,
      buildDate: release.buildDate,
      missingPackage: true,
    })
    await expect(fwup.shell().getByRole('button', { name: 'Release notes' })).toHaveCount(0)
  })

  test('blocks devices below v1.6 from in-app updates', async ({ lab, fwup, mockControl }) => {
    await connectFwupDevice(lab, mockControl, { stateFile: 'fwup-unsupported-fw.json' })
    await lab.openFirmwareUpdate(SERIAL)
    await fwup.expectOpen()
    await fwup.expectUnsupportedFirmwareBlocked()
    await fwup.expectDetails({
      serial: SERIAL,
      hardware: HW_ELIGIBLE,
      buildDate: release.buildDate,
      package: release.packageName,
      size: release.packageSizeLabel,
    })
    await expect(fwup.shell().getByRole('button', { name: 'Release notes' })).toHaveCount(0)
  })

  test('shows fetched release metadata in the check step and details panel', async ({
    lab,
    fwup,
    mockControl,
  }) => {
    await connectFwupDevice(lab, mockControl, { stateFile: 'fwup-eligible.json' })
    await lab.openFirmwareUpdate(SERIAL)
    await fwup.expectOpen()
    await fwup.waitForCheckOutcome('available')

    await fwup.expectVersionHero('1.6.0', release.version)
    await expect(fwup.shell().getByText(/Update available for your hardware/)).toBeVisible()
    await expect(fwup.primaryButton('Continue')).toBeEnabled()

    await fwup.expectDetails({
      serial: SERIAL,
      hardware: HW_ELIGIBLE,
      buildDate: release.buildDate,
      package: release.packageName,
      size: release.packageSizeLabel,
    })
  })

  test('fetches and renders bundled release notes for an available update', async ({
    lab,
    fwup,
    mockControl,
  }) => {
    await connectFwupDevice(lab, mockControl, { stateFile: 'fwup-eligible.json' })
    await lab.openFirmwareUpdate(SERIAL)
    await fwup.expectOpen()
    await fwup.waitForCheckOutcome('available')

    await fwup.expectReleaseNotes(release.releaseNoteItems, release.changelogUrl)
  })
})
