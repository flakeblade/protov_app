import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Code,
  Group,
  List,
  Loader,
  Modal,
  Progress,
  Stack,
  Stepper,
  Text,
} from '@mantine/core'
import { IconAlertTriangle, IconCircleCheck, IconDownload, IconRefresh } from '@tabler/icons-react'

const MOCK_LATEST_VERSION = '0.2.0'
const STEP_CONTENT_MIN_HEIGHT = 280
const MOCK_RELEASE_NOTES = [
  'Improved PD negotiation stability',
  'Fixed channel B over-current reporting',
  'Lower idle power draw on USB-only input',
]

interface FirmwareUpdateModalProps {
  opened: boolean
  onClose: () => void
  deviceName: string
  currentVersion: string
  serialNumber: string
}

type CheckState = 'checking' | 'available' | 'up-to-date'

export function FirmwareUpdateModal({
  opened,
  onClose,
  deviceName,
  currentVersion,
  serialNumber,
}: FirmwareUpdateModalProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [checkState, setCheckState] = useState<CheckState>('checking')
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [installProgress, setInstallProgress] = useState(0)
  const [installPhase, setInstallPhase] = useState('Preparing device for OTA…')
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)

  useEffect(() => {
    if (!opened) {
      setActiveStep(0)
      setCheckState('checking')
      setDownloadProgress(0)
      setInstallProgress(0)
      setInstallPhase('Preparing device for OTA…')
      setCancelConfirmOpen(false)
      return
    }

    setCheckState('checking')
    const timer = window.setTimeout(() => {
      setCheckState(currentVersion === MOCK_LATEST_VERSION ? 'up-to-date' : 'available')
    }, 1200)

    return () => window.clearTimeout(timer)
  }, [opened, currentVersion])

  useEffect(() => {
    if (activeStep !== 1 || downloadProgress >= 100) return

    const timer = window.setInterval(() => {
      setDownloadProgress((value) => Math.min(value + 8, 100))
    }, 180)

    return () => window.clearInterval(timer)
  }, [activeStep, downloadProgress])

  useEffect(() => {
    if (activeStep !== 2 || installProgress >= 100) return

    const phases = [
      { until: 25, label: 'Preparing device for OTA…' },
      { until: 55, label: 'Transferring firmware image…' },
      { until: 85, label: 'Verifying flash integrity…' },
      { until: 100, label: 'Finalizing update…' },
    ]

    const timer = window.setInterval(() => {
      setInstallProgress((value) => {
        const next = Math.min(value + 5, 100)
        const phase = phases.find((entry) => next <= entry.until)
        if (phase) setInstallPhase(phase.label)
        return next
      })
    }, 220)

    return () => window.clearInterval(timer)
  }, [activeStep, installProgress])

  const handleClose = () => {
    onClose()
  }

  const requiresCancelConfirmation = activeStep === 1 || activeStep === 2

  const handleRequestClose = () => {
    if (requiresCancelConfirmation) {
      setCancelConfirmOpen(true)
      return
    }
    handleClose()
  }

  const handleConfirmCancel = () => {
    setCancelConfirmOpen(false)
    handleClose()
  }

  const handleRecheck = () => {
    setCheckState('checking')
    window.setTimeout(() => {
      setCheckState(currentVersion === MOCK_LATEST_VERSION ? 'up-to-date' : 'available')
    }, 1200)
  }

  const downloadComplete = downloadProgress >= 100
  const installComplete = installProgress >= 100

  const handleNext = () => {
    if (activeStep === 0 && checkState === 'available') {
      setActiveStep(1)
      return
    }
    if (activeStep === 1 && downloadComplete) {
      setActiveStep(2)
      return
    }
    if (activeStep === 2 && installComplete) {
      setActiveStep(3)
    }
  }

  const handleBack = () => {
    setActiveStep((step) => Math.max(step - 1, 0))
  }

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleRequestClose}
        title={`Firmware update — ${deviceName}`}
        size="lg"
        centered
      >
        <Stack gap="lg">
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Serial
            </Text>
            <Code>{serialNumber}</Code>
            <Text size="sm" c="dimmed">
              ·
            </Text>
            <Text size="sm" c="dimmed">
              Installed
            </Text>
            <Code>v{currentVersion}</Code>
          </Group>

          <Stepper active={activeStep} allowNextStepsSelect={false}>
            <Stepper.Step label="Check" description="Release channel">
              <Box mih={STEP_CONTENT_MIN_HEIGHT}>
                <Stack gap="md" mt="md">
                  {checkState === 'checking' ? (
                    <>
                      <Text size="sm" c="dimmed">
                        Querying the release server for the latest firmware build compatible with your
                        hardware revision.
                      </Text>
                      <Group gap="sm">
                        <Loader size="sm" />
                        <Text size="sm">Checking releases…</Text>
                      </Group>
                    </>
                  ) : null}

                  {checkState === 'available' ? (
                    <Stack gap="sm">
                      <Alert color="blue" variant="light" title="Update available">
                        <Group gap="xs">
                          <Text size="sm">Latest release:</Text>
                          <Code>v{MOCK_LATEST_VERSION}</Code>
                          <Text size="sm" c="dimmed">
                            (you have v{currentVersion})
                          </Text>
                        </Group>
                      </Alert>
                      <Text size="sm" fw={500}>
                        Release notes
                      </Text>
                      <List size="sm" spacing={4}>
                        {MOCK_RELEASE_NOTES.map((note) => (
                          <List.Item key={note}>{note}</List.Item>
                        ))}
                      </List>
                      <Text size="xs" c="dimmed">
                        Package size: 412 KB · Signed build for HW rev A/B
                      </Text>
                    </Stack>
                  ) : null}

                  {checkState === 'up-to-date' ? (
                    <Stack gap="sm">
                      <Alert
                        color="green"
                        variant="light"
                        icon={<IconCircleCheck size={16} />}
                        title="Up to date"
                      >
                        <Text size="sm">
                          v{currentVersion} is the latest firmware on the release channel.
                        </Text>
                      </Alert>
                      <Button
                        leftSection={<IconRefresh size={16} />}
                        variant="subtle"
                        w="fit-content"
                        onClick={handleRecheck}
                      >
                        Check again
                      </Button>
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            </Stepper.Step>

            <Stepper.Step label="Download" description="Fetch image">
              <Box mih={STEP_CONTENT_MIN_HEIGHT}>
                <Stack gap="md" mt="md">
                  <Text size="sm" c="dimmed">
                    Downloading protov-mini-v{MOCK_LATEST_VERSION}.bin from the release CDN.
                  </Text>
                  <Progress
                    value={downloadProgress}
                    size="lg"
                    radius="xl"
                    animated={!downloadComplete}
                  />
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      {downloadComplete ? 'Download complete' : 'Downloading…'}
                    </Text>
                    <Text size="sm" fw={500}>
                      {downloadProgress}%
                    </Text>
                  </Group>
                  {!downloadComplete ? (
                    <Group gap="sm">
                      <Loader size="sm" />
                      <Text size="sm">412 KB / 412 KB</Text>
                    </Group>
                  ) : (
                    <Alert
                      color="green"
                      variant="light"
                      icon={<IconDownload size={16} />}
                      title="Ready to install"
                    >
                      Firmware image verified and cached locally.
                    </Alert>
                  )}
                </Stack>
              </Box>
            </Stepper.Step>

            <Stepper.Step label="Install" description="OTA flash">
              <Box mih={STEP_CONTENT_MIN_HEIGHT}>
                <Stack gap="md" mt="md">
                  <Alert
                    color="yellow"
                    variant="light"
                    icon={<IconAlertTriangle size={16} />}
                    title="Keep the device connected"
                  >
                    Do not disconnect USB or power off the device while the OTA update is in progress.
                    Outputs will be disabled during flashing.
                  </Alert>
                  <Text size="sm">{installPhase}</Text>
                  <Progress
                    value={installProgress}
                    size="lg"
                    radius="xl"
                    animated={!installComplete}
                  />
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      {installComplete ? 'Flash complete' : 'Flashing…'}
                    </Text>
                    <Text size="sm" fw={500}>
                      {installProgress}%
                    </Text>
                  </Group>
                </Stack>
              </Box>
            </Stepper.Step>

            <Stepper.Completed>
              <Box mih={STEP_CONTENT_MIN_HEIGHT}>
                <Stack gap="md" mt="md" align="center" justify="center" h="100%">
                  <IconCircleCheck size={48} stroke={1.5} color="var(--mantine-color-green-6)" />
                  <Stack gap={4} align="center">
                    <Text fw={600}>Update complete</Text>
                    <Text size="sm" c="dimmed" ta="center">
                      {deviceName} is now running v{MOCK_LATEST_VERSION}. The device rebooted and should
                      reconnect automatically.
                    </Text>
                  </Stack>
                </Stack>
              </Box>
            </Stepper.Completed>
          </Stepper>

          <Group justify="space-between">
            {activeStep > 0 && activeStep < 3 ? (
              <Button variant="default" onClick={handleBack}>
                Back
              </Button>
            ) : (
              <span />
            )}

            {activeStep === 0 && checkState === 'available' ? (
              <Button onClick={handleNext}>Continue</Button>
            ) : null}

            {activeStep === 1 && downloadComplete ? (
              <Button onClick={handleNext}>Install update</Button>
            ) : null}

            {activeStep === 2 && installComplete ? (
              <Button onClick={handleNext}>Finish</Button>
            ) : null}

            {activeStep === 3 || checkState === 'up-to-date' ? (
              <Button onClick={handleClose}>Close</Button>
            ) : null}
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={cancelConfirmOpen}
        onClose={() => {
          setCancelConfirmOpen(false)
        }}
        title={activeStep === 1 ? 'Cancel download?' : 'Cancel firmware update?'}
        centered
        size="sm"
      >
        <Stack gap="lg">
          {activeStep === 1 ? (
            <Text size="sm">
              The firmware image is still downloading. Closing now will stop the download and discard
              any progress. You can check for updates again later.
            </Text>
          ) : (
            <Stack gap="sm">
              <Text size="sm">
                An OTA update is in progress on {deviceName}. Closing this window will not stop the
                flash on the device, but you will lose visibility into progress and recovery steps.
              </Text>
              <Alert
                color="red"
                variant="light"
                icon={<IconAlertTriangle size={16} />}
                title="Risk of bricking"
              >
                Interrupting an in-progress flash may leave the device unresponsive. Keep USB connected
                and wait for the update to finish unless instructed otherwise.
              </Alert>
            </Stack>
          )}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setCancelConfirmOpen(false)
              }}
            >
              {activeStep === 1 ? 'Keep downloading' : 'Keep updating'}
            </Button>
            <Button color="red" onClick={handleConfirmCancel}>
              {activeStep === 1 ? 'Cancel download' : 'Close anyway'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
