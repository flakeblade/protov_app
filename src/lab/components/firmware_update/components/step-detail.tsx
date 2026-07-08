import { Link } from 'react-router-dom'
import { Anchor, Button, Loader, Text } from '@mantine/core'
import { IconCheck, IconRefresh } from '@tabler/icons-react'
import clsx from 'clsx'

import { getDocPath } from '../../../../docs/docsConfig'
import { MIN_SCPI_FWUP_VERSION } from '../../../firmware/version'
import type { CheckState, PostInstallPhase } from '../types'
import { ProgressBar } from './progress-bar'
import classes from '../../firmware_update_modal.module.css'

export interface StepDetailProps {
  stepIndex: number
  activeStep: number
  checkState: CheckState
  checkError: string | null
  downloadProgress: number
  downloadComplete: boolean
  downloadError: string | null
  installProgress: number
  installPhase: string
  installError: string | null
  installComplete: boolean
  installing: boolean
  postInstallPhase: PostInstallPhase
  rebootProgress: number
  sessionStartProgress: number
  reconnecting: boolean
  verifiedFwVersion: string | null
  verifySuccess: boolean
  onRecheck: () => void
}

export function StepDetail({
  stepIndex,
  activeStep,
  checkState,
  checkError,
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
  verifiedFwVersion,
  verifySuccess,
  onRecheck,
}: StepDetailProps) {
  if (activeStep !== stepIndex) return null

  if (stepIndex === 0) {
    if (checkState === 'checking') {
      return (
        <div className={classes.inlineStatus}>
          <Loader size="xs" color="gray" />
          <Text className={classes.mutedText}>Checking releases…</Text>
        </div>
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
            onClick={onRecheck}
          >
            Check again
          </Button>
        </>
      )
    }
    if (checkState === 'unsupported-fw') {
      return (
        <>
          <Text className={classes.errorText}>
            In-app updates require firmware v{MIN_SCPI_FWUP_VERSION} or newer.
          </Text>
          <Text className={classes.mutedText}>
            Update manually via USB bootloader or SWD: see the{' '}
            <Anchor component={Link} to={getDocPath('firmware-update')} className={classes.docsLink}>
              firmware update docs
            </Anchor>
            .
          </Text>
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
            onClick={onRecheck}
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
    const rebooting = postInstallPhase === 'awaiting_disconnect'
    const sessionStarting = installing && installPhase === 'Starting firmware update session…'
    const progressValue = rebooting
      ? rebootProgress
      : sessionStarting
        ? sessionStartProgress
        : installProgress
    const progressLabel = installError
      ? 'Failed'
      : installing
        ? installPhase
        : rebooting
          ? 'Rebooting…'
          : installComplete
            ? 'Complete'
            : 'Waiting…'

    return (
      <>
        <ProgressBar value={progressValue} animated={installing || rebooting || sessionStarting} />
        <div className={classes.progressMeta}>
          <Text className={classes.progressLabel}>{progressLabel}</Text>
          <Text className={clsx(classes.progressValue, classes.progressPercent)}>
            {progressValue}%
          </Text>
        </div>
      </>
    )
  }

  if (stepIndex === 3) {
    return reconnecting ? (
      <div className={classes.inlineStatus}>
        <Loader size="xs" color="gray" />
        <Text className={classes.mutedText}>Opening port picker…</Text>
      </div>
    ) : (
      <Text className={classes.stepDetailText}>Ready to reconnect.</Text>
    )
  }

  if (stepIndex === 4) {
    if (verifySuccess) {
      return (
        <div className={classes.successCompact}>
          <div className={classes.successTitle}>
            <IconCheck size={14} stroke={2.5} className={classes.successIcon} />
            Update successful
          </div>
          <Text className={classes.mutedText}>Running v{verifiedFwVersion}.</Text>
        </div>
      )
    }
    if (verifiedFwVersion !== null) {
      return (
        <>
          <Text className={classes.errorText}>Version mismatch.</Text>
          <Text className={classes.mutedText}>
            Try reconnecting again or power-cycle the device.
          </Text>
        </>
      )
    }
    return null
  }

  return null
}
