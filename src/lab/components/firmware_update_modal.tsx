import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ActionIcon,
  Anchor,
  Button,
  Collapse,
  Loader,
  Modal,
  Text,
  UnstyledButton,
} from '@mantine/core'
import {
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconExternalLink,
  IconRefresh,
  IconX,
} from '@tabler/icons-react'
import clsx from 'clsx'

import { FwupError, queryHardwareRevision } from '../firmware/fwup-client'
import { parseInlineMarkdown, parseReleaseNotes } from '../firmware/release-notes'
import {
  downloadReleaseAsset,
  fetchLatestRelease,
  formatBytes,
  isUpdateAvailable,
  selectFirmwarePackage,
  type FirmwarePackage,
  type FirmwareRelease,
} from '../firmware/releases'
import { useDeviceStore } from '../devices/device_store'
import type { LabDevice } from '../devices/device_types'
import classes from './firmware_update_modal.module.css'

const STEPS = [
  { key: 'check', label: 'Check' },
  { key: 'download', label: 'Download' },
  { key: 'install', label: 'Install' },
  { key: 'confirm', label: 'Confirm' },
] as const

const NOTES_COLLAPSE_THRESHOLD = 3

type CheckState = 'checking' | 'available' | 'up-to-date' | 'incompatible' | 'error'

interface FirmwareUpdateModalProps {
  opened: boolean
  onClose: () => void
  deviceId: string
}

interface FirmwareUpdateDeviceSnapshot {
  id: string
  name: string
  serialNumber: string
  fwVersion: string
  hwVersion: string
}

function snapshotFromDevice(device: LabDevice): FirmwareUpdateDeviceSnapshot {
  return {
    id: device.id,
    name: device.name,
    serialNumber: device.serialNumber,
    fwVersion: device.fwVersion,
    hwVersion: device.hwVersion,
  }
}

interface PrimaryAction {
  label: string
  enabled: boolean
  reason?: string
  onClick?: () => void
  loading?: boolean
}

function formatBuildDate(release: FirmwareRelease): string {
  const iso = release.bundledAt ?? release.publishedAt
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatFwupError(error: unknown): string {
  if (error instanceof FwupError) {
    const parts = [error.message]
    if (error.details?.systErr) parts.push(`SYST:ERR? → ${error.details.systErr}`)
    if (error.details?.fwupStat) parts.push(`SYST:FWUP:STAT? → ${error.details.fwupStat}`)
    return parts.join(' · ')
  }
  if (error instanceof Error) return error.message
  return 'Firmware update failed'
}

function renderInlineMarkdown(text: string): ReactNode {
  return parseInlineMarkdown(text).map((part, index) =>
    part.type === 'bold' ? (
      <Text span fw={600} key={index}>
        {part.value}
      </Text>
    ) : (
      part.value
    ),
  )
}

function ProgressBar({ value, animated }: { value: number; animated?: boolean }) {
  return (
    <div className={classes.progressTrack}>
      <div
        className={classes.progressFill}
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          ...(animated ? { transition: 'width 240ms ease' } : {}),
        }}
      />
    </div>
  )
}

function Disclosure({
  label,
  opened,
  onToggle,
  children,
}: {
  label: string
  opened: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className={classes.disclosure}>
      <UnstyledButton className={classes.disclosureTrigger} onClick={onToggle}>
        <span>{label}</span>
        <IconChevronDown
          size={16}
          className={clsx(classes.disclosureChevron, opened && classes.disclosureChevronOpen)}
        />
      </UnstyledButton>
      <Collapse in={opened}>
        <div className={classes.disclosureBody}>{children}</div>
      </Collapse>
    </div>
  )
}

function VersionHero({
  installedVersion,
  targetVersion,
  checking,
  upToDate,
}: {
  installedVersion: string
  targetVersion: string
  checking: boolean
  upToDate: boolean
}) {
  if (upToDate) {
    return (
      <div className={classes.versionHero}>
        <span className={classes.versionLabel}>Installed</span>
        <span className={classes.versionValue}>v{installedVersion}</span>
        <span className={classes.upToDateBadge}>Up to date</span>
      </div>
    )
  }

  return (
    <div className={classes.versionHero}>
      <span className={classes.versionLabel}>Installed</span>
      <span className={classes.versionValue}>v{installedVersion}</span>
      <IconArrowRight size={16} stroke={1.5} className={classes.versionArrow} />
      <span className={classes.versionLabel}>Latest</span>
      <span
        className={clsx(
          classes.versionValue,
          classes.versionValueLatest,
          checking && classes.versionValueMuted,
        )}
      >
        {checking ? '…' : `v${targetVersion}`}
      </span>
    </div>
  )
}

function ReleaseNotesPanel({ body }: { body: string }) {
  const { items, changelogUrl } = parseReleaseNotes(body)
  const [expanded, setExpanded] = useState(items.length <= NOTES_COLLAPSE_THRESHOLD)
  const visibleItems = expanded ? items : items.slice(0, NOTES_COLLAPSE_THRESHOLD)
  const hasHiddenItems = items.length > NOTES_COLLAPSE_THRESHOLD

  if (items.length === 0 && !changelogUrl) {
    return <Text className={classes.mutedText}>No release notes for this build.</Text>
  }

  return (
    <>
      {items.length > 0 ? (
        <>
          <ul className={classes.notesList}>
            {visibleItems.map((note) => (
              <li key={note} className={classes.notesItem}>
                {renderInlineMarkdown(note)}
              </li>
            ))}
          </ul>
          {hasHiddenItems ? (
            <UnstyledButton
              className={classes.changelogLink}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Show fewer notes' : `Show ${items.length - NOTES_COLLAPSE_THRESHOLD} more`}
            </UnstyledButton>
          ) : null}
        </>
      ) : null}
      {changelogUrl ? (
        <Anchor
          href={changelogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={classes.changelogLink}
        >
          See full changelog
          <IconExternalLink size={14} stroke={1.75} />
        </Anchor>
      ) : null}
    </>
  )
}

export function FirmwareUpdateModal({ opened, onClose, deviceId }: FirmwareUpdateModalProps) {
  const { devices, runFirmwareUpdate, abortFirmwareUpdate, beginFwupSession, endFwupSession } =
    useDeviceStore()
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
  const [updateConfirmed, setUpdateConfirmed] = useState(false)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(true)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
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
    setUpdateConfirmed(false)
    setDetailsOpen(false)
    setReleaseNotesOpen(true)
    setCancelConfirmOpen(false)
    abortRef.current = null
  }, [])

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
      try {
        const [latestRelease, detectedHw] = await Promise.all([
          fetchLatestRelease(),
          queryHardwareRevision(transport),
        ])
        if (cancelled) return

        const pkg = selectFirmwarePackage(latestRelease, detectedHw)
        setRelease(latestRelease)
        setHwRevision(detectedHw)

        if (!pkg) {
          setCheckState('incompatible')
          setCheckError(`No signed firmware build for hardware revision ${detectedHw}.`)
          return
        }

        setFirmwarePackage(pkg)
        setReleaseNotesOpen(parseReleaseNotes(latestRelease.body).items.length <= NOTES_COLLAPSE_THRESHOLD)
        setCheckState(
          isUpdateAvailable(device.fwVersion, latestRelease.version) ? 'available' : 'up-to-date',
        )
      } catch (error) {
        if (cancelled) return
        setCheckState('error')
        setCheckError(formatFwupError(error))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [device, opened, resetState, transport])

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

  const handleClose = () => {
    abortRef.current?.abort()
    onClose()
  }

  const requiresCancelConfirmation = activeStep === 1 || (activeStep === 2 && installing)

  const handleRequestClose = () => {
    if (requiresCancelConfirmation) {
      setCancelConfirmOpen(true)
      return
    }
    handleClose()
  }

  const handleConfirmCancel = () => {
    abortRef.current?.abort()
    if (liveDevice && activeStep === 2) {
      void abortFirmwareUpdate(liveDevice.id)
    }
    setCancelConfirmOpen(false)
    handleClose()
  }

  const handleRecheck = () => {
    if (!device || !transport) {
      setCheckState('error')
      setCheckError('Device is disconnected. Reconnect it from the Devices page, then check again.')
      return
    }
    setCheckState('checking')
    setCheckError(null)
    void (async () => {
      try {
        const latestRelease = await fetchLatestRelease()
        const detectedHw = await queryHardwareRevision(transport)
        const pkg = selectFirmwarePackage(latestRelease, detectedHw)
        setRelease(latestRelease)
        setHwRevision(detectedHw)
        if (!pkg) {
          setCheckState('incompatible')
          setCheckError(`No signed firmware build for hardware revision ${detectedHw}.`)
          return
        }
        setFirmwarePackage(pkg)
        setReleaseNotesOpen(parseReleaseNotes(latestRelease.body).items.length <= NOTES_COLLAPSE_THRESHOLD)
        setCheckState(
          isUpdateAvailable(device.fwVersion, latestRelease.version) ? 'available' : 'up-to-date',
        )
      } catch (error) {
        setCheckState('error')
        setCheckError(formatFwupError(error))
      }
    })()
  }

  const handleInstall = async () => {
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
      setActiveStep(3)
    } catch (error) {
      setInstallError(formatFwupError(error))
    } finally {
      setInstalling(false)
      abortRef.current = null
    }
  }

  const handleNext = () => {
    if (activeStep === 0 && checkState === 'available') {
      setActiveStep(1)
      return
    }
    if (activeStep === 1 && downloadComplete) {
      setActiveStep(2)
      void handleInstall()
    }
    if (activeStep === 3 && installComplete) {
      setUpdateConfirmed(true)
    }
  }

  const handleBack = () => {
    if (activeStep === 2 && installing) return
    if (activeStep >= 3) return
    setActiveStep((step) => Math.max(step - 1, 0))
  }

  if (!opened || !device) return null

  const installedVersion = liveDevice?.fwVersion ?? device.fwVersion
  const targetVersion = release?.version ?? installedVersion
  const buildDate = release ? formatBuildDate(release) : ''
  const packageSize = firmwarePackage ? formatBytes(firmwarePackage.firmware.size) : ''
  const hwLabel = hwRevision ?? device.hwVersion
  const showReleaseNotes = Boolean(release?.body && checkState === 'available')

  const getPrimaryAction = (): PrimaryAction => {
    if (updateConfirmed) {
      return { label: 'Close', enabled: true, onClick: handleClose }
    }

    if (activeStep === 0) {
      if (checkState === 'checking') {
        return { label: 'Continue', enabled: false, reason: 'Waiting for release check…' }
      }
      if (checkState === 'available') {
        return { label: 'Continue', enabled: true, onClick: handleNext }
      }
      return { label: 'Close', enabled: true, onClick: handleClose }
    }

    if (activeStep === 1) {
      if (downloadError) return { label: 'Close', enabled: true, onClick: handleClose }
      if (!downloadComplete) {
        return {
          label: 'Install update',
          enabled: false,
          reason: downloadProgress > 0 ? `Downloading… ${downloadProgress}%` : 'Downloading firmware…',
        }
      }
      return { label: 'Install update', enabled: true, onClick: handleNext, loading: installing }
    }

    if (activeStep === 2) {
      if (installError) return { label: 'Close', enabled: true, onClick: handleClose }
      if (installing) {
        return { label: 'Installing…', enabled: false, reason: installPhase, loading: true }
      }
      return { label: 'Installing…', enabled: false, reason: 'Waiting to start install…' }
    }

    if (activeStep === 3 && installComplete) {
      return { label: 'Complete update', enabled: true, onClick: handleNext }
    }

    return { label: 'Close', enabled: true, onClick: handleClose }
  }

  const primaryAction = getPrimaryAction()
  const showBack = activeStep > 0 && activeStep < 3 && !installing && !updateConfirmed

  const renderStepDetail = (stepIndex: number): ReactNode => {
    const isActive = activeStep === stepIndex || (updateConfirmed && stepIndex === 3)
    if (!isActive) return null

    if (stepIndex === 0) {
      if (checkState === 'checking') {
        return (
          <>
            <div className={classes.inlineStatus}>
              <Loader size="xs" color="gray" />
              <Text className={classes.mutedText}>Checking releases…</Text>
            </div>
          </>
        )
      }
      if (checkState === 'available') {
        return <Text className={classes.bodyText}>Update available for your hardware.</Text>
      }
      if (checkState === 'up-to-date') {
        return (
          <>
            <Text className={classes.bodyText}>Device matches latest bundled release.</Text>
            <Button
              leftSection={<IconRefresh size={12} />}
              variant="subtle"
              size="compact-xs"
              className={classes.compactButton}
              onClick={handleRecheck}
            >
              Check again
            </Button>
          </>
        )
      }
      if ((checkState === 'error' || checkState === 'incompatible') && checkError) {
        return (
          <>
            <Text className={classes.errorText}>{checkError}</Text>
            <Button
              leftSection={<IconRefresh size={12} />}
              variant="subtle"
              size="compact-xs"
              className={classes.compactButton}
              onClick={handleRecheck}
            >
              Try again
            </Button>
          </>
        )
      }
      return null
    }

    if (stepIndex === 1) {
      return (
        <>
          <ProgressBar value={downloadProgress} animated={!downloadComplete && !downloadError} />
          <div className={classes.progressMeta}>
            <Text className={classes.progressLabel}>
              {downloadError ? 'Failed' : downloadComplete ? 'Ready' : 'Downloading…'}
            </Text>
            <Text className={clsx(classes.progressValue, classes.progressPercent)}>
              {downloadProgress}%
            </Text>
          </div>
          {downloadError ? <Text className={classes.errorText}>{downloadError}</Text> : null}
        </>
      )
    }

    if (stepIndex === 2) {
      return (
        <>
          <Text className={classes.mutedText}>Keep USB connected. Outputs disabled.</Text>
          <ProgressBar value={installProgress} animated={installing && !installComplete} />
          <div className={classes.progressMeta}>
            <Text className={classes.progressLabel} lineClamp={2}>
              {installError ? 'Failed' : installing ? installPhase : 'Waiting…'}
            </Text>
            <Text className={clsx(classes.progressValue, classes.progressPercent)}>
              {installProgress}%
            </Text>
          </div>
          {installError ? <Text className={classes.errorText}>{installError}</Text> : null}
        </>
      )
    }

    if (stepIndex === 3) {
      if (updateConfirmed) {
        return (
          <div className={classes.successCompact}>
            <div className={classes.successTitle}>
              <IconCheck size={14} stroke={2.5} className={classes.successIcon} />
              Update complete
            </div>
            <Text className={classes.mutedText}>
              Running v{targetVersion}. Refresh status if needed.
            </Text>
          </div>
        )
      }
      return (
        <>
          <Text className={classes.bodyText}>Firmware v{targetVersion} written to device.</Text>
          <Text className={classes.mutedText}>
            {linkLost
              ? 'Reconnect the device, then confirm once *IDN? reports the new version.'
              : `Confirm once reconnected and version reads v${targetVersion}.`}
          </Text>
        </>
      )
    }

    return null
  }

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleRequestClose}
        withCloseButton={false}
        padding={0}
        centered
        size={720}
        closeOnClickOutside={!installing}
        closeOnEscape={!installing}
        classNames={{
          body: classes.modalBody,
          content: classes.modalContent,
        }}
      >
        <div className={classes.modalShell}>
          <header className={classes.modalHeader}>
            <div className={classes.modalTitleGroup}>
              <span className={classes.modalTitle}>Firmware update</span>
              <span className={classes.modalSubtitle}>{device.name}</span>
            </div>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              aria-label="Close"
              className={classes.modalClose}
              onClick={handleRequestClose}
            >
              <IconX size={18} stroke={1.75} />
            </ActionIcon>
          </header>

          <div className={classes.columns}>
            <div className={classes.leftColumn}>
              <VersionHero
                installedVersion={installedVersion}
                targetVersion={targetVersion}
                checking={checkState === 'checking'}
                upToDate={checkState === 'up-to-date'}
              />

              {linkLost ? (
                <Text className={classes.linkLostBanner}>
                  Device disconnected — this is normal during OTA reboot. Reconnect from the Devices
                  page when the device returns, then confirm the new version.
                </Text>
              ) : null}

              <div className={classes.leftScroll}>
                {showReleaseNotes && release ? (
                  <Disclosure
                    label="Release notes"
                    opened={releaseNotesOpen}
                    onToggle={() => setReleaseNotesOpen((value) => !value)}
                  >
                    <ReleaseNotesPanel body={release.body} />
                  </Disclosure>
                ) : null}

                {release ? (
                  <Disclosure label="Details" opened={detailsOpen} onToggle={() => setDetailsOpen((v) => !v)}>
                    <div className={classes.detailsGrid}>
                      <div className={classes.detailRow}>
                        <span className={classes.detailLabel}>Serial</span>
                        <span className={classes.detailValue}>{device.serialNumber}</span>
                      </div>
                      <div className={classes.detailRow}>
                        <span className={classes.detailLabel}>Hardware</span>
                        <span className={classes.detailValue}>{hwLabel}</span>
                      </div>
                      <div className={classes.detailRow}>
                        <span className={classes.detailLabel}>Build date</span>
                        <span className={classes.detailValue}>{buildDate}</span>
                      </div>
                      {firmwarePackage ? (
                        <>
                          <div className={classes.detailRow}>
                            <span className={classes.detailLabel}>Package</span>
                            <span className={classes.detailValue}>{firmwarePackage.firmware.name}</span>
                          </div>
                          <div className={classes.detailRow}>
                            <span className={classes.detailLabel}>Size</span>
                            <span className={classes.detailValue}>{packageSize}</span>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </Disclosure>
                ) : null}
              </div>
            </div>

            <div className={classes.rightColumn}>
              <span className={classes.statusLabel}>Progress</span>
              <ol className={classes.stepper}>
                {STEPS.map((step, index) => {
                  const isComplete =
                    updateConfirmed ||
                    index < activeStep ||
                    (index === 2 && installComplete && activeStep >= 3)
                  const isActive = !updateConfirmed && activeStep === index

                  return (
                    <li
                      key={step.key}
                      className={clsx(
                        classes.stepRow,
                        isComplete && classes.stepRowComplete,
                        (isActive || (updateConfirmed && index === 3)) && classes.stepRowActive,
                      )}
                    >
                      <div className={classes.stepRail}>
                        <div className={classes.stepDot}>
                          {isComplete ? <IconCheck size={11} stroke={2.5} /> : index + 1}
                        </div>
                        <div className={classes.stepLine} />
                      </div>
                      <div className={classes.stepMain}>
                        <span className={classes.stepTitle}>{step.label}</span>
                        <div className={classes.stepDetailSlot}>
                          <div className={classes.stepDetailInner}>{renderStepDetail(index)}</div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>

          <div className={classes.footer}>
            {!primaryAction.enabled && primaryAction.reason ? (
              <Text className={classes.footerReason}>{primaryAction.reason}</Text>
            ) : null}
            <div className={classes.footerActions}>
              {showBack ? (
                <Button variant="subtle" color="gray" onClick={handleBack}>
                  Back
                </Button>
              ) : null}
              <Button
                onClick={primaryAction.onClick}
                disabled={!primaryAction.enabled}
                loading={primaryAction.loading}
              >
                {primaryAction.label}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        opened={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        title={activeStep === 1 ? 'Cancel download?' : 'Cancel firmware update?'}
        centered
        size="sm"
      >
        <div className={classes.cancelBody}>
          {activeStep === 1 ? (
            <Text className={classes.bodyText}>
              The firmware image is still downloading. Closing now stops the download and discards
              progress.
            </Text>
          ) : (
            <>
              <Text className={classes.bodyText}>
                An install is in progress on {device.name}. Closing attempts to abort the session,
                but the device may still be writing firmware.
              </Text>
              <div className={classes.callout}>
                <Text className={classes.bodyText}>
                  Prefer waiting until the progress bar completes. Interrupting mid-flash can leave
                  the device unresponsive.
                </Text>
              </div>
            </>
          )}

          <div className={classes.footerActions}>
            <Button variant="subtle" color="gray" onClick={() => setCancelConfirmOpen(false)}>
              {activeStep === 1 ? 'Keep downloading' : 'Keep installing'}
            </Button>
            <Button variant="default" onClick={handleConfirmCancel}>
              {activeStep === 1 ? 'Cancel download' : 'Close anyway'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
