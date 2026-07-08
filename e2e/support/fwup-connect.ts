import type { Page, Route } from '@playwright/test'

import type { LabPage } from '../pages/lab.page'
import type { FirmwareUpdatePage } from '../pages/firmware-update.page'
import type { MockControlClient } from './mock-control'
import { connectMockDevices } from './lab-connect'

export interface ConnectFwupDeviceOptions {
  slot?: number
  stateFile: string
}

/** Connect one mock device on the given slot with a firmware-update state preset. */
export async function connectFwupDevice(
  lab: LabPage,
  mockControl: MockControlClient,
  options: ConnectFwupDeviceOptions,
) {
  const { slot = 0, stateFile } = options

  await lab.gotoDevices()
  await lab.setEngineeringView()
  await mockControl.recoverPool()

  for (let index = 0; index < slot; index += 1) {
    await mockControl.waitForFreeSlots(1)
    await mockControl.resetSlot(index)
    await lab.clickConnect()
    await lab.expectDeviceCount(index + 1)
  }

  await mockControl.waitForFreeSlots(1)
  await mockControl.loadStateFile(slot, stateFile)
  await lab.clickConnect()
  await lab.expectDeviceCount(slot + 1)
}

/** Close an in-progress install and release mock resources. */
export async function abortInstallAndClose(fwup: FirmwareUpdatePage) {
  await fwup.dismissMain('escape')
  await fwup.expectGuardDialog({
    title: 'Cancel firmware update?',
    body: /install is in progress/,
    stayLabel: 'Keep installing',
    leaveLabel: 'Close anyway',
  })
  await fwup.leaveGuard()
}

/** Preload a slot identity before the UI reconnects after an OTA reboot. */
export async function presetPostRebootIdentity(
  mockControl: MockControlClient,
  slot: number,
  identity: { serial: string; fwVersion: string; hwVersion: string },
) {
  await mockControl.loadState(slot, {
    idn: {
      serial: identity.serial,
      fw_version: identity.fwVersion,
      hw_version: identity.hwVersion,
    },
  })
}

export async function openEligibleFirmwareUpdate(
  lab: LabPage,
  fwup: FirmwareUpdatePage,
  mockControl: MockControlClient,
  serial = '550e8400',
) {
  await connectFwupDevice(lab, mockControl, { stateFile: 'fwup-eligible.json' })
  await lab.openFirmwareUpdate(serial)
  await fwup.expectOpen()
  await fwup.waitForCheckOutcome('available')
}

export async function advanceToDownload(
  lab: LabPage,
  fwup: FirmwareUpdatePage,
  mockControl: MockControlClient,
) {
  await openEligibleFirmwareUpdate(lab, fwup, mockControl)
  await fwup.clickPrimary('Continue')
  await fwup.expectPreflightWarning()
  await fwup.acknowledgePreflightAndContinue()
  await fwup.waitForActiveStep('Download')
}

/** Delay each firmware .bin fetch so download-step UI assertions can run reliably. */
export async function withSlowFirmwareDownloads<T>(
  page: Page,
  delayMs: number,
  run: () => Promise<T>,
): Promise<T> {
  const handler = async (route: Route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    await route.continue()
  }
  await page.route('**/firmware/**/*.bin', handler)
  try {
    return await run()
  } finally {
    await page.unroute('**/firmware/**/*.bin', handler)
  }
}
