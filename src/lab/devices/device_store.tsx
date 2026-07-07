import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { IconCode, IconNumber, IconNut } from '@tabler/icons-react'

import type { ChannelColor } from '../devices/channel-colors'
import type { DeviceBadge } from '../components/device_card'
import type { SetpointParam } from './device_io'
import { deviceRuntime } from './device_runtime'
import type { LabDevice } from './device_types'

export type { LabDevice } from './device_types'

interface DeviceStoreValue {
  devices: readonly LabDevice[]
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
  updateChannelColor: (deviceId: string, channelIdentifier: string, color: ChannelColor) => Promise<void>
  updateLcdBrightness: (deviceId: string, value: number) => Promise<void>
  updateLedBrightness: (deviceId: string, value: number) => Promise<void>
  disableAllOutputs: () => Promise<void>
  runFirmwareUpdate: (
    deviceId: string,
    firmware: Uint8Array,
    signature: Uint8Array,
    options?: {
      onProgress?: (progress: import('../firmware/fwup-client').FwupProgress) => void
      signal?: AbortSignal
    },
  ) => Promise<void>
  abortFirmwareUpdate: (deviceId: string) => Promise<void>
  reconnectDevice: (
    deviceId: string,
    options?: { quiet?: boolean },
  ) => Promise<{ fwVersion: string; hwVersion: string }>
  beginFwupSession: (deviceId: string) => void
  endFwupSession: (deviceId: string) => void
}

const DeviceStateContext = createContext<{
  devices: readonly LabDevice[]
  connecting: boolean
} | null>(null)

const DeviceActionsContext = createContext<{
  connectDevice: () => Promise<void>
  disconnectDevice: (deviceId: string) => Promise<void>
  toggleChannelOutput: (deviceId: string, channelIdentifier: string) => Promise<void>
  updateChannelSetpoint: (
    deviceId: string,
    channelIdentifier: string,
    param: SetpointParam,
    value: number,
  ) => Promise<void>
  updateChannelColor: (deviceId: string, channelIdentifier: string, color: ChannelColor) => Promise<void>
  updateLcdBrightness: (deviceId: string, value: number) => Promise<void>
  updateLedBrightness: (deviceId: string, value: number) => Promise<void>
  disableAllOutputs: () => Promise<void>
  runFirmwareUpdate: (
    deviceId: string,
    firmware: Uint8Array,
    signature: Uint8Array,
    options?: {
      onProgress?: (progress: import('../firmware/fwup-client').FwupProgress) => void
      signal?: AbortSignal
    },
  ) => Promise<void>
  abortFirmwareUpdate: (deviceId: string) => Promise<void>
  reconnectDevice: (
    deviceId: string,
    options?: { quiet?: boolean },
  ) => Promise<{ fwVersion: string; hwVersion: string }>
  beginFwupSession: (deviceId: string) => void
  endFwupSession: (deviceId: string) => void
} | null>(null)

function deviceBadges(device: LabDevice): DeviceBadge[] {
  return [
    { label: `FW v${device.fwVersion}`, icon: IconCode },
    { label: `HW rev ${device.hwVersion}`, icon: IconNut },
    { label: `SN ${device.serialNumber}`, icon: IconNumber },
  ]
}

export function useDevices(): readonly LabDevice[] {
  return useSyncExternalStore(
    deviceRuntime.subscribe,
    deviceRuntime.getSnapshot,
    deviceRuntime.getEmptySnapshot,
  )
}

export function useDeviceActions() {
  const value = useContext(DeviceActionsContext)
  if (!value) {
    throw new Error('useDeviceActions must be used within DeviceStoreProvider')
  }
  return value
}

export function useDeviceStore(): DeviceStoreValue {
  const state = useContext(DeviceStateContext)
  const actions = useContext(DeviceActionsContext)
  if (!state || !actions) {
    throw new Error('useDeviceStore must be used within DeviceStoreProvider')
  }
  return { ...state, ...actions }
}

export function useDeviceBadges(device: LabDevice): DeviceBadge[] {
  return useMemo(() => deviceBadges(device), [device])
}

interface DeviceStoreProviderProps {
  children: ReactNode
}

export function DeviceStoreProvider({ children }: DeviceStoreProviderProps) {
  const devices = useSyncExternalStore(
    deviceRuntime.subscribe,
    deviceRuntime.getSnapshot,
    deviceRuntime.getEmptySnapshot,
  )
  const [connecting, setConnecting] = useState(false)

  const connectDevice = useCallback(async () => {
    if (connecting) return
    await deviceRuntime.connect(setConnecting)
  }, [connecting])

  const disconnectDevice = useCallback(async (deviceId: string) => {
    await deviceRuntime.disconnect(deviceId)
  }, [])

  const toggleChannelOutput = useCallback(
    async (deviceId: string, channelIdentifier: string) => {
      await deviceRuntime.toggleChannelOutput(deviceId, channelIdentifier)
    },
    [],
  )

  const updateChannelSetpoint = useCallback(
    async (deviceId: string, channelIdentifier: string, param: SetpointParam, value: number) => {
      await deviceRuntime.updateChannelSetpoint(deviceId, channelIdentifier, param, value)
    },
    [],
  )

  const updateChannelColor = useCallback(
    async (deviceId: string, channelIdentifier: string, color: ChannelColor) => {
      await deviceRuntime.updateChannelColor(deviceId, channelIdentifier, color)
    },
    [],
  )

  const updateLcdBrightness = useCallback(async (deviceId: string, value: number) => {
    await deviceRuntime.updateLcdBrightness(deviceId, value)
  }, [])

  const updateLedBrightness = useCallback(async (deviceId: string, value: number) => {
    await deviceRuntime.updateLedBrightness(deviceId, value)
  }, [])

  const disableAllOutputs = useCallback(async () => {
    await deviceRuntime.disableAllOutputs()
  }, [])

  const runFirmwareUpdate = useCallback(
    async (
      deviceId: string,
      firmware: Uint8Array,
      signature: Uint8Array,
      options?: {
        onProgress?: (progress: import('../firmware/fwup-client').FwupProgress) => void
        signal?: AbortSignal
      },
    ) => {
      await deviceRuntime.runFirmwareUpdate(deviceId, firmware, signature, options)
    },
    [],
  )

  const abortFirmwareUpdate = useCallback(async (deviceId: string) => {
    await deviceRuntime.abortFirmwareUpdate(deviceId)
  }, [])

  const reconnectDevice = useCallback(
    async (deviceId: string, options?: { quiet?: boolean }) => {
      return deviceRuntime.reconnectDevice(deviceId, options)
    },
    [],
  )

  const beginFwupSession = useCallback((deviceId: string) => {
    deviceRuntime.beginFwupSession(deviceId)
  }, [])

  const endFwupSession = useCallback((deviceId: string) => {
    deviceRuntime.endFwupSession(deviceId)
  }, [])

  const stateValue = useMemo(
    () => ({
      devices,
      connecting,
    }),
    [connecting, devices],
  )

  const actionsValue = useMemo(
    () => ({
      connectDevice,
      disconnectDevice,
      toggleChannelOutput,
      updateChannelSetpoint,
      updateChannelColor,
      updateLcdBrightness,
      updateLedBrightness,
      disableAllOutputs,
      runFirmwareUpdate,
      abortFirmwareUpdate,
      reconnectDevice,
      beginFwupSession,
      endFwupSession,
    }),
    [
      connectDevice,
      disconnectDevice,
      toggleChannelOutput,
      updateChannelSetpoint,
      updateChannelColor,
      updateLcdBrightness,
      updateLedBrightness,
      disableAllOutputs,
      runFirmwareUpdate,
      abortFirmwareUpdate,
      reconnectDevice,
      beginFwupSession,
      endFwupSession,
    ],
  )

  return (
    <DeviceActionsContext.Provider value={actionsValue}>
      <DeviceStateContext.Provider value={stateValue}>{children}</DeviceStateContext.Provider>
    </DeviceActionsContext.Provider>
  )
}
