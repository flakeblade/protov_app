import { Container, SimpleGrid } from '@mantine/core'
import { useNavigate } from 'react-router-dom'

import { ConnectDeviceCard } from '../components/connect_device_card'
import { DeviceCard } from '../components/device_card'
import { MAX_DEVICES } from '../devices/device-colors'
import { useDeviceBadges, useDeviceStore } from '../devices/device_store'

function ConnectedDeviceCard({ deviceId }: { deviceId: string }) {
  const navigate = useNavigate()
  const { devices, disconnectDevice, toggleChannelOutput } = useDeviceStore()
  const device = devices.find((entry) => entry.id === deviceId)
  const badges = useDeviceBadges(device!)

  if (!device) return null

  return (
    <DeviceCard
      name={device.name}
      port={device.port}
      description={device.description}
      badges={badges}
      channels={device.channels}
      onChannelToggle={(identifier) => {
        void toggleChannelOutput(device.id, identifier)
      }}
      buttonLabel="Go to controls"
      onButtonClick={() => {
        navigate('/lab/controls')
      }}
      secondaryButtonLabel="Disconnect"
      onSecondaryButtonClick={() => {
        void disconnectDevice(device.id)
      }}
    />
  )
}

export function DevicesPage() {
  const { devices, connecting, connectDevice } = useDeviceStore()

  return (
    <Container>
      <SimpleGrid
        type="container"
        cols={{ base: 1, '300px': 1, '700px': 2, '900px': 3 }}
        spacing={{ base: 'md' }}
      >
        {devices.map((device) => (
          <ConnectedDeviceCard key={device.id} deviceId={device.id} />
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
    </Container>
  )
}
