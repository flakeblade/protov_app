import type { FirmwarePackage, FirmwareRelease } from '../../firmware/releases'

export type CheckState =
  | 'checking'
  | 'available'
  | 'up-to-date'
  | 'unsupported-fw'
  | 'incompatible'
  | 'error'

export type PostInstallPhase = 'none' | 'awaiting_disconnect' | 'disconnected'

export type StepKey = 'check' | 'download' | 'install' | 'reconnect' | 'confirm'

export interface FirmwareUpdateModalProps {
  opened: boolean
  onClose: () => void
  deviceId: string
}

export interface FirmwareUpdateDeviceSnapshot {
  id: string
  name: string
  serialNumber: string
  fwVersion: string
  hwVersion: string
}

export interface PrimaryAction {
  label: string
  enabled: boolean
  reason?: string
  onClick?: () => void
  loading?: boolean
}

export interface CancelPrompt {
  title: string
  body: string
  stayLabel: string
  leaveLabel: string
  warn?: boolean
}

export interface CheckReleaseResult {
  checkState: Exclude<CheckState, 'checking'>
  checkError?: string
  release: FirmwareRelease
  hwRevision: string
  firmwarePackage: FirmwarePackage | null
  releaseNotesOpen: boolean
}

export interface ModalLogicContext {
  activeStep: number
  checkState: CheckState
  downloadComplete: boolean
  downloadError: string | null
  downloadProgress: number
  installError: string | null
  installing: boolean
  installPhase: string
  postInstallPhase: PostInstallPhase
  reconnectError: string | null
  reconnecting: boolean
  verifiedFwVersion: string | null
  verifySuccess: boolean
  targetVersion: string
  deviceName: string
}
