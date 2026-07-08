import type { StepKey } from './types'

export const FIRMWARE_UPDATE_STEPS: ReadonlyArray<{ key: StepKey; label: string }> = [
  { key: 'check', label: 'Check' },
  { key: 'download', label: 'Download' },
  { key: 'install', label: 'Install' },
  { key: 'reconnect', label: 'Reconnect' },
  { key: 'confirm', label: 'Confirm' },
] as const

export const REBOOT_WAIT_MS = 60_000
export const REBOOT_PROGRESS_MS = 18_000
export const SESSION_START_PROGRESS_MS = 4_000

export const NOTES_COLLAPSE_THRESHOLD = 3

/** Stable hook for Playwright — matches e2e/pages/firmware-update.page.ts step keys. */
export const FIRMWARE_UPDATE_MODAL_TITLE = 'Firmware update'
