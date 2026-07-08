import type { CancelPrompt, ModalLogicContext, PrimaryAction } from './types'

export function requiresCancelConfirmation(ctx: ModalLogicContext): boolean {
  return (
    ctx.activeStep === 1 ||
    (ctx.activeStep === 2 &&
      (ctx.installing || ctx.postInstallPhase === 'awaiting_disconnect')) ||
    ctx.activeStep === 3 ||
    (ctx.activeStep === 4 && ctx.verifySuccess)
  )
}

export function getCancelPrompt(ctx: ModalLogicContext): CancelPrompt {
  if (ctx.activeStep === 1) {
    return {
      title: 'Cancel download?',
      body: 'The firmware image is still downloading. Closing now stops the download and discards progress.',
      stayLabel: 'Keep downloading',
      leaveLabel: 'Cancel download',
    }
  }

  if (ctx.activeStep === 2 && ctx.installing) {
    return {
      title: 'Cancel firmware update?',
      body: `An install is in progress on ${ctx.deviceName}. Closing attempts to abort the session, but the device may still be writing firmware.`,
      stayLabel: 'Keep installing',
      leaveLabel: 'Close anyway',
      warn: true,
    }
  }

  if (ctx.activeStep === 2 && ctx.postInstallPhase === 'awaiting_disconnect') {
    return {
      title: 'Leave before reconnect?',
      body: 'The device is rebooting after install. Stay to finish reconnecting and verify the new firmware version.',
      stayLabel: 'Stay and wait',
      leaveLabel: 'Close anyway',
    }
  }

  if (ctx.activeStep === 3) {
    return {
      title: 'Leave before reconnect?',
      body: 'Stay to select the device in the port picker and confirm the update succeeded.',
      stayLabel: 'Stay and reconnect',
      leaveLabel: 'Close anyway',
    }
  }

  return {
    title: 'Leave before completing?',
    body: 'Firmware verified successfully. Stay to finish the update flow.',
    stayLabel: 'Stay and complete',
    leaveLabel: 'Close anyway',
  }
}

export function getFooterStatus(
  ctx: ModalLogicContext,
  primaryAction: PrimaryAction,
): string | null {
  if (ctx.activeStep === 2) {
    if (ctx.installError) return ctx.installError
    if (ctx.installing) return ctx.installPhase
    if (ctx.postInstallPhase === 'awaiting_disconnect') {
      return 'Device rebooting — keep USB connected. Reconnect starts automatically.'
    }
  }

  if (ctx.activeStep === 3) {
    if (ctx.reconnecting) return 'Choose your device in the port picker.'
    if (ctx.reconnectError) return ctx.reconnectError
    return 'Device rebooted — press Select device to reconnect.'
  }

  if (ctx.activeStep === 4) {
    if (ctx.verifySuccess) {
      return `Update verified — running v${ctx.verifiedFwVersion}.`
    }
    if (ctx.verifiedFwVersion !== null) {
      return `Version mismatch — expected v${ctx.targetVersion}, found v${ctx.verifiedFwVersion}.`
    }
  }

  if (!primaryAction.enabled && primaryAction.reason) return primaryAction.reason
  return null
}

export interface PrimaryActionHandlers {
  onContinue: () => void
  onClose: () => void
}

export function getPrimaryAction(
  ctx: ModalLogicContext,
  handlers: PrimaryActionHandlers,
): PrimaryAction {
  if (ctx.activeStep === 0) {
    if (ctx.checkState === 'checking') {
      return { label: 'Continue', enabled: false, reason: 'Waiting for release check…' }
    }
    if (ctx.checkState === 'available') {
      return { label: 'Continue', enabled: true, onClick: handlers.onContinue }
    }
    return { label: 'Close', enabled: true, onClick: handlers.onClose }
  }

  if (ctx.activeStep === 1) {
    if (ctx.downloadError) {
      return { label: 'Close', enabled: true, onClick: handlers.onClose }
    }
    if (!ctx.downloadComplete) {
      return {
        label: 'Install update',
        enabled: false,
        reason:
          ctx.downloadProgress > 0
            ? `Downloading… ${ctx.downloadProgress}%`
            : 'Downloading firmware…',
      }
    }
    return {
      label: 'Install update',
      enabled: true,
      onClick: handlers.onContinue,
      loading: ctx.installing,
    }
  }

  if (ctx.activeStep === 2) {
    if (ctx.installError) {
      return { label: 'Close', enabled: true, onClick: handlers.onClose }
    }
    if (ctx.installing) {
      return {
        label: 'Installing…',
        enabled: false,
        reason: ctx.installPhase,
        loading: true,
      }
    }
    if (ctx.postInstallPhase === 'awaiting_disconnect') {
      return {
        label: 'Waiting for reboot…',
        enabled: false,
        reason: 'Waiting for device to disconnect…',
      }
    }
    return { label: 'Installing…', enabled: false, reason: 'Waiting to start install…' }
  }

  if (ctx.activeStep === 3) {
    return {
      label: 'Select device',
      enabled: true,
      onClick: handlers.onContinue,
      loading: ctx.reconnecting,
    }
  }

  if (ctx.activeStep === 4) {
    if (ctx.verifySuccess) {
      return { label: 'Complete', enabled: true, onClick: handlers.onContinue }
    }
    return { label: 'Close', enabled: true, onClick: handlers.onClose }
  }

  return { label: 'Close', enabled: true, onClick: handlers.onClose }
}

export function shouldShowBack(ctx: ModalLogicContext): boolean {
  return (
    ctx.activeStep > 0 &&
    ctx.activeStep < 3 &&
    !ctx.installing &&
    ctx.postInstallPhase === 'none' &&
    !ctx.reconnecting
  )
}
