import { FwupError } from '../../firmware/fwup-client'
import type { FirmwareRelease } from '../../firmware/releases'
import type { LabDevice } from '../../devices/device_types'
import type { FirmwareUpdateDeviceSnapshot } from './types'

export function snapshotFromDevice(device: LabDevice): FirmwareUpdateDeviceSnapshot {
  return {
    id: device.id,
    name: device.name,
    serialNumber: device.serialNumber,
    fwVersion: device.fwVersion,
    hwVersion: device.hwVersion,
  }
}

export function formatBuildDate(release: FirmwareRelease): string {
  const iso = release.bundledAt ?? release.publishedAt
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatFwupError(error: unknown): string {
  if (error instanceof FwupError) {
    const parts = [error.message]
    if (error.details?.systErr) parts.push(`SYST:ERR? → ${error.details.systErr}`)
    if (error.details?.fwupStat) parts.push(`SYST:FWUP:STAT? → ${error.details.fwupStat}`)
    return parts.join(' · ')
  }
  if (error instanceof Error) return error.message
  return 'Firmware update failed'
}
