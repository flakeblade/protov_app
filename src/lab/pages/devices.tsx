import { useState } from 'react'
import { Container, SimpleGrid } from '@mantine/core'
import { useNavigate } from 'react-router-dom'

import { ConnectDeviceCard } from '../components/connect_device_card'
import { DeviceCard } from '../components/device_card'
import { FirmwareUpdateModal } from '../components/firmware_update_modal'
import { MAX_DEVICES } from '../devices/device-colors'
import { useDeviceBadges, useDeviceStore } from '../devices/device_store'

function ConnectedDeviceCard({
  deviceId,
  onCheckForUpdates,
}: {
  deviceId: string
  onCheckForUpdates: (deviceId: string) => void
}) {
  const navigate = useNavigate()
  const { devices, disconnectDevice, toggleChannelOutput } = useDeviceStore()
  const [disconnecting, setDisconnecting] = useState(false)
  const device = devices.find((entry) => entry.id === deviceId)
  const badges = useDeviceBadges(device!)

  if (!device) return null

  return (
    <DeviceCard
      name={device.name}
      description={device.description}
      badges={badges}
      channels={device.channels}
      onChannelToggle={(identifier) => {
        void toggleChannelOutput(device.id, identifier)
      }}
      onCheckForUpdates={() => {
        onCheckForUpdates(device.id)
      }}
      buttonLabel="Go to controls"
      onButtonClick={() => {
        navigate('/lab/controls')
      }}
      secondaryButtonLabel="Disconnect"
      secondaryButtonLoading={disconnecting}
      onSecondaryButtonClick={() => {
        setDisconnecting(true)
        void disconnectDevice(device.id).finally(() => {
          setDisconnecting(false)
        })
      }}
    />
  )
}

export function DevicesPage() {
  const { devices, connecting, connectDevice } = useDeviceStore()
  const [fwupDeviceId, setFwupDeviceId] = useState<string | null>(null)

  return (
    <Container>
      <SimpleGrid
        type="container"
        cols={{ base: 1, '300px': 1, '700px': 2, '900px': 3 }}
        spacing={{ base: 'md' }}
      >
        {devices.map((device) => (
          <ConnectedDeviceCard
            key={device.id}
            deviceId={device.id}
            onCheckForUpdates={setFwupDeviceId}
          />
        ))}

        <ConnectDeviceCard
          connecting={connecting}
          connectedCount={devices.length}
          maxDevices={MAX_DEVICES}
          onConnect={() => {
            void connectDevice()
          }}
        />
      </SimpleGrid>

      <FirmwareUpdateModal
        opened={fwupDeviceId !== null}
        deviceId={fwupDeviceId ?? ''}
        onClose={() => {
          setFwupDeviceId(null)
        }}
      />
    </Container>
  )
}
