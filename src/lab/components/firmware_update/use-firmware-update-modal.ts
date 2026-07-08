import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { compareVersions } from '../../firmware/version'
import {
  downloadReleaseAsset,
  formatBytes,
  type FirmwarePackage,
  type FirmwareRelease,
} from '../../firmware/releases'
import { useDeviceStore } from '../../devices/device_store'
import { performReleaseCheckSafe } from './check-release'
import {
  REBOOT_PROGRESS_MS,
  REBOOT_WAIT_MS,
  SESSION_START_PROGRESS_MS,
} from './constants'
import {
  getCancelPrompt,
  getFooterStatus,
  getPrimaryAction,
  requiresCancelConfirmation,
  shouldShowBack,
} from './modal-logic'
import type { CheckState, FirmwareUpdateDeviceSnapshot, PostInstallPhase } from './types'
import { formatBuildDate, formatFwupError, snapshotFromDevice } from './utils'

export function useFirmwareUpdateModal(deviceId: string, opened: boolean, onClose: () => void) {
  const {
    devices,
    runFirmwareUpdate,
    abortFirmwareUpdate,
    beginFwupSession,
    endFwupSession,
    reconnectDevice,
  } = useDeviceStore()

  const liveDevice = devices.find((entry) => entry.id === deviceId)
  const [snapshot, setSnapshot] = useState<FirmwareUpdateDeviceSnapshot | null>(null)

  const device = liveDevice ?? snapshot
  const linkLost = liveDevice?.linkLost ?? (snapshot !== null && !liveDevice)
  const transport = liveDevice?.transport

  const [activeStep, setActiveStep] = useState(0)
  const [checkState, setCheckState] = useState<CheckState>('checking')
  const [checkError, setCheckError] = useState<string | null>(null)
  const [release, setRelease] = useState<FirmwareRelease | null>(null)
  const [firmwarePackage, setFirmwarePackage] = useState<FirmwarePackage | null>(null)
  const [hwRevision, setHwRevision] = useState<string | null>(null)

  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloadComplete, setDownloadComplete] = useState(false)
  const firmwareRef = useRef<Uint8Array | null>(null)
  const signatureRef = useRef<Uint8Array | null>(null)

  const [installProgress, setInstallProgress] = useState(0)
  const [installPhase, setInstallPhase] = useState('Preparing device…')
  const [installError, setInstallError] = useState<string | null>(null)
  const [installComplete, setInstallComplete] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [postInstallPhase, setPostInstallPhase] = useState<PostInstallPhase>('none')
  const [rebootProgress, setRebootProgress] = useState(0)
  const [sessionStartProgress, setSessionStartProgress] = useState(0)
  const [reconnecting, setReconnecting] = useState(false)
  const [reconnectError, setReconnectError] = useState<string | null>(null)
  const [verifiedFwVersion, setVerifiedFwVersion] = useState<string | null>(null)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(true)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [preflightAckOpen, setPreflightAckOpen] = useState(false)
  const [preflightAckChecked, setPreflightAckChecked] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const initialCheckStartedRef = useRef(false)

  const resetState = useCallback(() => {
    setActiveStep(0)
    setCheckState('checking')
    setCheckError(null)
    setRelease(null)
    setFirmwarePackage(null)
    setHwRevision(null)
    setDownloadProgress(0)
    setDownloadError(null)
    setDownloadComplete(false)
    firmwareRef.current = null
    signatureRef.current = null
    setInstallProgress(0)
    setInstallPhase('Preparing device…')
    setInstallError(null)
    setInstallComplete(false)
    setInstalling(false)
    setPostInstallPhase('none')
    setRebootProgress(0)
    setSessionStartProgress(0)
    setReconnecting(false)
    setReconnectError(null)
    setVerifiedFwVersion(null)
    setDetailsOpen(false)
    setReleaseNotesOpen(true)
    setCancelConfirmOpen(false)
    setPreflightAckOpen(false)
    setPreflightAckChecked(false)
    abortRef.current = null
  }, [])

  const applyCheckResult = useCallback(
    (result: Awaited<ReturnType<typeof performReleaseCheckSafe>>) => {
      if (result.checkState === 'error') {
        setCheckState('error')
        setCheckError(result.checkError ?? 'Firmware update failed')
        return
      }
      setRelease(result.release)
      setHwRevision(result.hwRevision)
      setFirmwarePackage(result.firmwarePackage)
      setReleaseNotesOpen(result.releaseNotesOpen)
      setCheckState(result.checkState)
      setCheckError(result.checkError ?? null)
    },
    [],
  )

  useEffect(() => {
    if (!opened) {
      resetState()
      setSnapshot(null)
      initialCheckStartedRef.current = false
      return
    }
    if (!deviceId) return

    beginFwupSession(deviceId)
    return () => {
      endFwupSession(deviceId)
    }
  }, [beginFwupSession, deviceId, endFwupSession, opened, resetState])

  useEffect(() => {
    if (!opened || !liveDevice) return
    setSnapshot(snapshotFromDevice(liveDevice))
  }, [liveDevice, opened])

  useEffect(() => {
    if (!opened || !transport || !device || initialCheckStartedRef.current) return

    initialCheckStartedRef.current = true
    let cancelled = false
    resetState()
    setCheckState('checking')

    void (async () => {
      const result = await performReleaseCheckSafe(transport, device)
      if (cancelled) return
      applyCheckResult(result)
    })()

    return () => {
      cancelled = true
    }
  }, [applyCheckResult, device, opened, resetState, transport])

  useEffect(() => {
    if (!opened || activeStep !== 1 || !firmwarePackage || downloadComplete || downloadError) return

    let cancelled = false
    setDownloadProgress(0)
    setDownloadError(null)

    void (async () => {
      try {
        const firmware = await downloadReleaseAsset(
          firmwarePackage.firmware,
          (loaded, total) => {
            if (cancelled) return
            const percent = total > 0 ? Math.round((loaded / total) * 100) : 0
            setDownloadProgress(percent)
          },
        )
        if (cancelled) return

        const signature = await downloadReleaseAsset(firmwarePackage.signature)
        if (cancelled) return

        firmwareRef.current = firmware
        signatureRef.current = signature
        setDownloadProgress(100)
        setDownloadComplete(true)
      } catch (error) {
        if (cancelled) return
        setDownloadError(formatFwupError(error))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeStep, downloadComplete, downloadError, firmwarePackage, opened])

  useEffect(() => {
    if (installPhase !== 'Starting firmware update session…') {
      setSessionStartProgress(0)
      return
    }

    const startedAt = performance.now()
    let frameId = 0

    const tick = (now: number) => {
      const elapsed = now - startedAt
      const percent = Math.min(100, Math.round((elapsed / SESSION_START_PROGRESS_MS) * 100))
      setSessionStartProgress(percent)
      if (elapsed < SESSION_START_PROGRESS_MS) {
        frameId = requestAnimationFrame(tick)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [installPhase])

  useEffect(() => {
    if (postInstallPhase !== 'awaiting_disconnect') {
      setRebootProgress(0)
      return
    }

    const startedAt = performance.now()
    let frameId = 0

    const tick = (now: number) => {
      const elapsed = now - startedAt
      const percent = Math.min(100, Math.round((elapsed / REBOOT_PROGRESS_MS) * 100))
      setRebootProgress(percent)
      if (percent < 100) {
        frameId = requestAnimationFrame(tick)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [postInstallPhase])

  useEffect(() => {
    if (postInstallPhase !== 'awaiting_disconnect') return

    const timeoutId = window.setTimeout(() => {
      setInstallError('Update failed — device did not reboot in time.')
      setPostInstallPhase('none')
    }, REBOOT_WAIT_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [postInstallPhase])

  useEffect(() => {
    if (postInstallPhase !== 'awaiting_disconnect' || !linkLost) return
    setPostInstallPhase('disconnected')
    setActiveStep(3)
  }, [linkLost, postInstallPhase])

  const installedVersion = liveDevice?.fwVersion ?? device?.fwVersion ?? ''
  const targetVersion = release?.version ?? installedVersion
  const verifySuccess = useMemo(
    () => verifiedFwVersion !== null && compareVersions(verifiedFwVersion, targetVersion) >= 0,
    [targetVersion, verifiedFwVersion],
  )

  const logicContext = useMemo(
    () => ({
      activeStep,
      checkState,
      downloadComplete,
      downloadError,
      downloadProgress,
      installError,
      installing,
      installPhase,
      postInstallPhase,
      reconnectError,
      reconnecting,
      verifiedFwVersion,
      verifySuccess,
      targetVersion,
      deviceName: device?.name ?? '',
    }),
    [
      activeStep,
      checkState,
      device?.name,
      downloadComplete,
      downloadError,
      downloadProgress,
      installError,
      installPhase,
      installing,
      postInstallPhase,
      reconnectError,
      reconnecting,
      targetVersion,
      verifiedFwVersion,
      verifySuccess,
    ],
  )

  const needsCancelConfirmation = requiresCancelConfirmation(logicContext)

  const handleClose = useCallback(() => {
    abortRef.current?.abort()
    onClose()
  }, [onClose])

  const handleRecheck = useCallback(() => {
    if (!device || !transport) {
      setCheckState('error')
      setCheckError('Device is disconnected. Reconnect it from the Devices page, then check again.')
      return
    }
    setCheckState('checking')
    setCheckError(null)
    void (async () => {
      const result = await performReleaseCheckSafe(transport, device)
      applyCheckResult(result)
    })()
  }, [applyCheckResult, device, transport])

  const handleInstall = useCallback(async () => {
    if (!device || !transport || !firmwareRef.current || !signatureRef.current) {
      setInstallError('Device is not connected. Reconnect USB and try again.')
      return
    }

    setInstalling(true)
    setInstallError(null)
    setInstallProgress(0)
    setInstallPhase('Preparing device…')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await runFirmwareUpdate(device.id, firmwareRef.current, signatureRef.current, {
        signal: controller.signal,
        onProgress: (progress) => {
          setInstallProgress(progress.percent)
          setInstallPhase(progress.message)
        },
      })
      setInstallComplete(true)
      setInstallProgress(100)
      setPostInstallPhase('awaiting_disconnect')
    } catch (error) {
      setInstallError(formatFwupError(error))
    } finally {
      setInstalling(false)
      abortRef.current = null
    }
  }, [device, runFirmwareUpdate, transport])

  const handleReconnect = useCallback(async () => {
    setReconnecting(true)
    setReconnectError(null)

    try {
      const { fwVersion } = await reconnectDevice(deviceId, { quiet: true })
      setVerifiedFwVersion(fwVersion)
      setActiveStep(4)
    } catch (error) {
      setReconnectError(error instanceof Error ? error.message : 'Failed to reconnect device')
    } finally {
      setReconnecting(false)
    }
  }, [deviceId, reconnectDevice])

  const handleNext = useCallback(() => {
    if (activeStep === 0 && checkState === 'available') {
      setPreflightAckChecked(false)
      setPreflightAckOpen(true)
      return
    }
    if (activeStep === 1 && downloadComplete) {
      setActiveStep(2)
      void handleInstall()
    }
    if (activeStep === 3) {
      void handleReconnect()
    }
    if (activeStep === 4 && verifySuccess) {
      handleClose()
    }
  }, [
    activeStep,
    checkState,
    downloadComplete,
    handleClose,
    handleInstall,
    handleReconnect,
    verifySuccess,
  ])

  const handlePreflightConfirm = useCallback(() => {
    if (!preflightAckChecked) return
    setPreflightAckOpen(false)
    setActiveStep(1)
  }, [preflightAckChecked])

  const handleBack = useCallback(() => {
    if (activeStep === 2 && (installing || postInstallPhase !== 'none')) return
    if (activeStep >= 3) return
    setActiveStep((step) => Math.max(step - 1, 0))
  }, [activeStep, installing, postInstallPhase])

  const handleConfirmCancel = useCallback(() => {
    abortRef.current?.abort()
    if (liveDevice && activeStep === 2 && installing) {
      void abortFirmwareUpdate(liveDevice.id)
    }
    setCancelConfirmOpen(false)
    handleClose()
  }, [abortFirmwareUpdate, activeStep, handleClose, installing, liveDevice])

  const handleRequestClose = useCallback(() => {
    if (needsCancelConfirmation) {
      setCancelConfirmOpen(true)
      return
    }
    handleClose()
  }, [handleClose, needsCancelConfirmation])

  const primaryAction = useMemo(
    () =>
      getPrimaryAction(logicContext, {
        onContinue: handleNext,
        onClose: handleClose,
      }),
    [handleClose, handleNext, logicContext],
  )

  const footerStatus = useMemo(
    () => getFooterStatus(logicContext, primaryAction),
    [logicContext, primaryAction],
  )

  const cancelPrompt = useMemo(() => getCancelPrompt(logicContext), [logicContext])
  const showBack = shouldShowBack(logicContext)

  const buildDate = release ? formatBuildDate(release) : ''
  const packageSize = firmwarePackage ? formatBytes(firmwarePackage.firmware.size) : ''
  const hwLabel = hwRevision ?? device?.hwVersion ?? ''
  const showReleaseNotes = Boolean(release?.body && checkState === 'available')

  return {
    device,
    installedVersion,
    targetVersion,
    buildDate,
    packageSize,
    hwLabel,
    showReleaseNotes,
    release,
    firmwarePackage,
    checkState,
    checkError,
    activeStep,
    downloadProgress,
    downloadComplete,
    downloadError,
    installProgress,
    installPhase,
    installError,
    installComplete,
    installing,
    postInstallPhase,
    rebootProgress,
    sessionStartProgress,
    reconnecting,
    reconnectError,
    verifiedFwVersion,
    verifySuccess,
    detailsOpen,
    setDetailsOpen,
    releaseNotesOpen,
    setReleaseNotesOpen,
    cancelConfirmOpen,
    setCancelConfirmOpen,
    preflightAckOpen,
    setPreflightAckOpen,
    preflightAckChecked,
    setPreflightAckChecked,
    primaryAction,
    footerStatus,
    cancelPrompt,
    showBack,
    handleRequestClose,
    handleConfirmCancel,
    handleRecheck,
    handleBack,
    handlePreflightConfirm,
  }
}
