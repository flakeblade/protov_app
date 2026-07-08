import { ActionIcon, Button, Modal, Text } from '@mantine/core'
import { IconX } from '@tabler/icons-react'

import { FIRMWARE_UPDATE_MODAL_TITLE } from './constants'
import { DetailsPanel } from './components/details-panel'
import { Disclosure } from './components/disclosure'
import { GuardModal } from './components/guard-modal'
import { PreflightModal } from './components/preflight-modal'
import { ReleaseNotesPanel } from './components/release-notes-panel'
import { FirmwareUpdateStepper } from './components/stepper'
import { VersionHero } from './components/version-hero'
import type { FirmwareUpdateModalProps } from './types'
import { useFirmwareUpdateModal } from './use-firmware-update-modal'
import classes from '../firmware_update_modal.module.css'

export function FirmwareUpdateModal({ opened, onClose, deviceId }: FirmwareUpdateModalProps) {
  const modal = useFirmwareUpdateModal(deviceId, opened, onClose)

  if (!opened || !modal.device) return null

  const {
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
  } = modal

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleRequestClose}
        withCloseButton={false}
        padding={0}
        centered
        size={880}
        closeOnClickOutside
        closeOnEscape
        classNames={{
          body: classes.modalBody,
          content: classes.modalContent,
        }}
      >
        <div className={classes.modalShell} data-testid="firmware-update-modal">
          <header className={classes.modalHeader}>
            <div className={classes.modalTitleGroup}>
              <span className={classes.modalTitle}>{FIRMWARE_UPDATE_MODAL_TITLE}</span>
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
                blocked={checkState === 'unsupported-fw'}
              />

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
                  <DetailsPanel
                    opened={detailsOpen}
                    onToggle={() => setDetailsOpen((value) => !value)}
                    serialNumber={device.serialNumber}
                    hwLabel={hwLabel}
                    buildDate={buildDate}
                    firmwarePackage={firmwarePackage}
                    packageSize={packageSize}
                  />
                ) : null}
              </div>
            </div>

            <div className={classes.rightColumn}>
              <span className={classes.statusLabel}>Progress</span>
              <FirmwareUpdateStepper
                activeStep={activeStep}
                checkState={checkState}
                checkError={checkError}
                downloadProgress={downloadProgress}
                downloadComplete={downloadComplete}
                downloadError={downloadError}
                installProgress={installProgress}
                installPhase={installPhase}
                installError={installError}
                installComplete={installComplete}
                installing={installing}
                postInstallPhase={postInstallPhase}
                rebootProgress={rebootProgress}
                sessionStartProgress={sessionStartProgress}
                reconnecting={reconnecting}
                verifiedFwVersion={verifiedFwVersion}
                verifySuccess={verifySuccess}
                onRecheck={handleRecheck}
              />
            </div>
          </div>

          <div className={classes.footer}>
            {footerStatus ? <Text className={classes.footerStatus}>{footerStatus}</Text> : null}
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

      <PreflightModal
        opened={preflightAckOpen}
        checked={preflightAckChecked}
        onCheckedChange={setPreflightAckChecked}
        onCancel={() => setPreflightAckOpen(false)}
        onConfirm={handlePreflightConfirm}
      />

      <GuardModal
        opened={cancelConfirmOpen}
        prompt={cancelPrompt}
        onStay={() => setCancelConfirmOpen(false)}
        onLeave={handleConfirmCancel}
      />
    </>
  )
}
