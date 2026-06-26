import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { notifications } from '@mantine/notifications'
import { IconCode, IconNumber, IconNut, IconPlugConnected, IconPlugConnectedX } from '@tabler/icons-react'

import type { DeviceBadge } from '../components/device_card'
import type { Channel } from '../components/channel_chip'
import {
  DEVICE_POLL_INTERVAL_MS,
  applyDeviceColorScheme,
  disableAllChannels,
  pollDeviceChannels,
  setChannelOutput,
  setChannelSetpoint,
  type SetpointParam,
} from './device_io'
import {
  EMPTY_TELEMETRY,
  pollDeviceTelemetry,
  type DeviceTelemetry,
} from './telemetry_io'
import { MAX_DEVICES, acquireColorSlot, rememberColorSlot } from './device-colors'
import { deviceSession } from './device_session'
import { openAndProbeTransport } from '../serial/probe-device'
import { requestSerialPort, usesMockTransport } from '../serial/request-port'
import { serialDebug, serialWarn } from '../serial/serial-debug'
import { isWebSerialSupported, type SerialTransport } from '../serial/types'
import { createTransportQueue, withTransportQueue } from '../serial/transport-queue'

export interface LabDevice {
  id: string
  name: string
  port: string
  description: string
  serialNumber: string
  fwVersion: string
  hwVersion: string
  channels: Channel[]
  telemetry: DeviceTelemetry
  colorSlot: number
  transport: SerialTransport
}

interface DeviceStoreValue {
  devices: LabDevice[]
  connecting: boolean
  connectDevice: () => Promise<void>
  disconnectDevice: (deviceId: string) => Promise<void>
  toggleChannelOutput: (deviceId: string, channelIdentifier: string) => Promise<void>
  updateChannelSetpoint: (
    deviceId: string,
    channelIdentifier: string,
    param: SetpointParam,
    value: number,
  ) => Promise<void>
  disableAllOutputs: () => Promise<void>
}

const DeviceStoreContext = createContext<DeviceStoreValue | null>(null)

function deviceBadges(device: LabDevice): DeviceBadge[] {
  return [
    { label: `FW v${device.fwVersion}`, icon: IconCode },
    { label: `HW rev ${device.hwVersion}`, icon: IconNut },
    { label: `SN ${device.serialNumber}`, icon: IconNumber },
  ]
}

export function useDeviceStore(): DeviceStoreValue {
  const value = useContext(DeviceStoreContext)
  if (!value) {
    throw new Error('useDeviceStore must be used within DeviceStoreProvider')
  }
  return value
}

export function useDeviceBadges(device: LabDevice): DeviceBadge[] {
  return useMemo(() => deviceBadges(device), [device])
}

interface DeviceStoreProviderProps {
  children: ReactNode
}

export function DeviceStoreProvider({ children }: DeviceStoreProviderProps) {
  const [devices, setDevicesState] = useState<LabDevice[]>(() => deviceSession.list())
  const [connecting, setConnecting] = useState(false)
  const devicesRef = useRef(devices)
  devicesRef.current = devices
  const serialColorSlotsRef = useRef(new Map<string, number>())

  const setDevices = useCallback(
    (value: LabDevice[] | ((current: LabDevice[]) => LabDevice[])) => {
      setDevicesState((current) => {
        const next = typeof value === 'function' ? value(current) : value
        deviceSession.replaceAll(next)
        return next
      })
    },
    [],
  )

  const connectDevice = useCallback(async () => {
    if (connecting) return

    if (devicesRef.current.length >= MAX_DEVICES) {
      notifications.show({
        id: 'device-limit-reached',
        title: 'Device limit reached',
        message: `You can connect up to ${MAX_DEVICES} ProtoV MINI devices at once.`,
        color: 'yellow',
      })
      return
    }

    if (!usesMockTransport() && !isWebSerialSupported()) {
      notifications.show({
        id: 'web-serial-unavailable',
        title: 'Web Serial unavailable',
        message: 'Use a Chromium-based browser with Web Serial support to connect hardware.',
        color: 'red',
        icon: <IconPlugConnectedX size={18} />,
      })
      return
    }

    setConnecting(true)
    serialDebug('connectDevice: start')

    try {
      serialDebug('connectDevice: requesting transport')
      const rawTransport = await requestSerialPort()
      const transport = withTransportQueue(rawTransport, createTransportQueue())
      serialDebug('connectDevice: probing device')
      const probed = await openAndProbeTransport(transport)

      if (deviceSession.has(probed.serialNumber)) {
        await transport.close()
        notifications.show({
          id: 'device-already-connected',
          title: 'Already connected',
          message: `ProtoV MINI ${probed.serialNumber} is already in the device list.`,
          color: 'yellow',
        })
        return
      }

      console.log(probed);

      const colorSlot = acquireColorSlot(
        probed.serialNumber,
        devicesRef.current,
        serialColorSlotsRef.current,
      )
      rememberColorSlot(serialColorSlotsRef.current, probed.serialNumber, colorSlot)
      await applyDeviceColorScheme(transport, colorSlot)
      const channels = await pollDeviceChannels(transport, probed.channels)
      const telemetry = await pollDeviceTelemetry(transport).catch(() => EMPTY_TELEMETRY)

      setDevices((current) => [
        ...current,
        {
          id: probed.serialNumber,
          name: probed.name,
          port: probed.port,
          description: probed.description,
          serialNumber: probed.serialNumber,
          fwVersion: probed.fwVersion,
          hwVersion: probed.hwVersion,
          channels,
          telemetry,
          colorSlot,
          transport,
        },
      ])

      notifications.show({
        id: 'device-connected',
        title: 'Device connected',
        message: `${probed.name} (${probed.serialNumber}) added.`,
        color: 'green',
        icon: <IconPlugConnected size={18} />,
      })
    } catch (error) {
      serialWarn('connectDevice: failed', error)
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        return
      }

      const message =
        error instanceof Error && error.message === 'INCOMPATIBLE_DEVICE'
          ? 'The selected serial device is not a compatible ProtoV MINI power supply.'
          : error instanceof Error
            ? error.message
            : 'Could not connect to the serial device.'

      notifications.show({
        id: 'device-connect-failed',
        title:
          error instanceof Error && error.message === 'INCOMPATIBLE_DEVICE'
            ? 'Incompatible device'
            : 'Connection failed',
        message,
        color: 'red',
        icon: <IconPlugConnectedX size={18} />,
      })
    } finally {
      setConnecting(false)
    }
  }, [connecting, setDevices])

  const disconnectDevice = useCallback(
    async (deviceId: string) => {
      const device = devicesRef.current.find((entry) => entry.id === deviceId)
      if (!device) return

      await device.transport.close()
      deviceSession.remove(deviceId)
      setDevices((current) => current.filter((entry) => entry.id !== deviceId))

      notifications.show({
        id: 'device-disconnected',
        title: 'Device disconnected',
        message: `${device.name} (${device.serialNumber}) removed.`,
        color: 'gray',
      })
    },
    [setDevices],
  )

  const toggleChannelOutput = useCallback(
    async (deviceId: string, channelIdentifier: string) => {
      const device = devicesRef.current.find((entry) => entry.id === deviceId)
      if (!device) return

      const channel = device.channels.find((entry) => entry.identifier === channelIdentifier)
      if (!channel) return

      const nextActive = !channel.active
      const priorChannel = channel

      setDevices((current) =>
        current.map((entry) => {
          if (entry.id !== deviceId) return entry
          return {
            ...entry,
            channels: entry.channels.map((ch) =>
              ch.identifier === channelIdentifier
                ? {
                    ...ch,
                    active: nextActive,
                    measuredVoltage: nextActive ? ch.measuredVoltage : 0,
                    measuredCurrent: nextActive ? ch.measuredCurrent : 0,
                  }
                : ch,
            ),
          }
        }),
      )

      try {
        await setChannelOutput(device.transport, channelIdentifier, nextActive)
        void pollDeviceChannels(device.transport, device.channels).then((channels) => {
          setDevices((current) =>
            current.map((entry) => (entry.id === deviceId ? { ...entry, channels } : entry)),
          )
        })
      } catch {
        setDevices((current) =>
          current.map((entry) => {
            if (entry.id !== deviceId) return entry
            return {
              ...entry,
              channels: entry.channels.map((ch) =>
                ch.identifier === channelIdentifier ? { ...priorChannel } : ch,
              ),
            }
          }),
        )
        notifications.show({
          id: 'channel-toggle-failed',
          title: 'Channel update failed',
          message: `Could not ${nextActive ? 'enable' : 'disable'} channel ${channelIdentifier}.`,
          color: 'red',
        })
      }
    },
    [],
  )

  const refreshDeviceChannels = useCallback(async (deviceId: string) => {
    const device = devicesRef.current.find((entry) => entry.id === deviceId)
    if (!device) return

    const channels = await pollDeviceChannels(device.transport, device.channels)
    setDevices((current) =>
      current.map((entry) => (entry.id === deviceId ? { ...entry, channels } : entry)),
    )
  }, [])

  const updateChannelSetpoint = useCallback(
    async (deviceId: string, channelIdentifier: string, param: SetpointParam, value: number) => {
      const device = devicesRef.current.find((entry) => entry.id === deviceId)
      if (!device) return

      try {
        await setChannelSetpoint(device.transport, channelIdentifier, param, value)
        await refreshDeviceChannels(deviceId)
      } catch {
        notifications.show({
          id: 'setpoint-update-failed',
          title: 'Setpoint update failed',
          message: `Could not update ${param} for channel ${channelIdentifier}.`,
          color: 'red',
        })
      }
    },
    [refreshDeviceChannels],
  )

  const disableAllOutputs = useCallback(async () => {
    const snapshot = devicesRef.current
    if (snapshot.length === 0) return

    try {
      await Promise.all(snapshot.map((device) => disableAllChannels(device.transport)))

      const refreshed = await Promise.all(
        snapshot.map(async (device) => ({
          id: device.id,
          channels: await pollDeviceChannels(device.transport, device.channels),
        })),
      )

      setDevices((current) =>
        current.map((device) => {
          const update = refreshed.find((entry) => entry.id === device.id)
          return update ? { ...device, channels: update.channels } : device
        }),
      )
    } catch {
      notifications.show({
        id: 'disable-all-failed',
        title: 'Disable all failed',
        message: 'Could not turn off all channel outputs.',
        color: 'red',
      })
    }
  }, [])

  useEffect(() => {
    if (devices.length === 0) return

    let cancelled = false

    const pollAll = async () => {
      const snapshot = devicesRef.current
      await Promise.all(
        snapshot.map(async (device) => {
          try {
            const [channels, telemetry] = await Promise.all([
              pollDeviceChannels(device.transport, device.channels),
              pollDeviceTelemetry(device.transport),
            ])
            if (cancelled) return
            setDevices((current) =>
              current.map((entry) =>
                entry.id === device.id ? { ...entry, channels, telemetry } : entry,
              ),
            )
          } catch {
            // Ignore transient poll errors while the transport is busy.
          }
        }),
      )
    }

    void pollAll()
    const timer = window.setInterval(() => {
      void pollAll()
    }, DEVICE_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [devices.length])

  const value = useMemo(
    () => ({
      devices,
      connecting,
      connectDevice,
      disconnectDevice,
      toggleChannelOutput,
      updateChannelSetpoint,
      disableAllOutputs,
    }),
    [
      connectDevice,
      connecting,
      devices,
      disconnectDevice,
      toggleChannelOutput,
      updateChannelSetpoint,
      disableAllOutputs,
    ],
  )

  return <DeviceStoreContext.Provider value={value}>{children}</DeviceStoreContext.Provider>
}
