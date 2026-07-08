import { queryHardwareRevision } from '../../firmware/fwup-client'
import { parseReleaseNotes } from '../../firmware/release-notes'
import {
  fetchLatestRelease,
  isUpdateAvailable,
  selectFirmwarePackage,
} from '../../firmware/releases'
import { supportsScpiFwup } from '../../firmware/version'
import type { SerialTransport } from '../../serial/types'
import { NOTES_COLLAPSE_THRESHOLD } from './constants'
import type { CheckReleaseResult } from './types'
import { formatFwupError } from './utils'

export async function performReleaseCheck(
  transport: SerialTransport,
  device: { fwVersion: string },
): Promise<CheckReleaseResult> {
  const [latestRelease, detectedHw] = await Promise.all([
    fetchLatestRelease(),
    queryHardwareRevision(transport),
  ])

  const pkg = selectFirmwarePackage(latestRelease, detectedHw)
  const releaseNotesOpen =
    parseReleaseNotes(latestRelease.body).items.length <= NOTES_COLLAPSE_THRESHOLD

  if (!pkg) {
    return {
      checkState: 'incompatible',
      checkError: `No signed firmware build for hardware revision ${detectedHw}.`,
      release: latestRelease,
      hwRevision: detectedHw,
      firmwarePackage: null,
      releaseNotesOpen: false,
    }
  }

  if (!supportsScpiFwup(device.fwVersion)) {
    return {
      checkState: 'unsupported-fw',
      release: latestRelease,
      hwRevision: detectedHw,
      firmwarePackage: pkg,
      releaseNotesOpen,
    }
  }

  return {
    checkState: isUpdateAvailable(device.fwVersion, latestRelease.version)
      ? 'available'
      : 'up-to-date',
    release: latestRelease,
    hwRevision: detectedHw,
    firmwarePackage: pkg,
    releaseNotesOpen,
  }
}

export async function performReleaseCheckSafe(
  transport: SerialTransport,
  device: { fwVersion: string },
): Promise<CheckReleaseResult | { checkState: 'error'; checkError: string }> {
  try {
    return await performReleaseCheck(transport, device)
  } catch (error) {
    return { checkState: 'error', checkError: formatFwupError(error) }
  }
}
