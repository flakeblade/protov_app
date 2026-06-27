import { notifications } from '@mantine/notifications'
import { IconPlugConnected, IconPlugConnectedX } from '@tabler/icons-react'

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
import { EMPTY_TELEMETRY, pollDeviceTelemetry } from './telemetry_io'
import { MAX_DEVICES, acquireColorSlot, rememberColorSlot } from './device-colors'
import { adjustChannelForActive, PendingChannelOutput } from './channel-output-pending'
import {
  patchDeviceList,
  reconcileChannels,
  telemetryEqual,
  updateDeviceInList,
} from './device_merge'
import { deviceSession } from './device_session'
import type { LabDevice } from './device_types'
import { openAndProbeTransport } from '../serial/probe-device'
import { requestSerialPort, usesMockTransport } from '../serial/request-port'
import { serialDebug, serialWarn } from '../serial/serial-debug'
import { isWebSerialSupported } from '../serial/types'
import { createTransportQueue, withTransportQueue } from '../serial/transport-queue'

type Listener = () => void

class DeviceRuntime {
  private devices: LabDevice[] = deviceSession.list()
  private readonly listeners = new Set<Listener>()
  private readonly pendingOutput = new PendingChannelOutput()
  private readonly serialColorSlots = new Map<string, number>()
  private pollTimer: number | null = null
  private pollInFlight = false

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): readonly LabDevice[] => this.devices

  getEmptySnapshot = (): readonly LabDevice[] => []

  private emit(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  private commit(next: LabDevice[]): void {
    if (next === this.devices) return
    this.devices = next
    deviceSession.replaceAll(next)
    this.syncPolling()
    this.emit()
  }

  private replace(updater: (current: LabDevice[]) => LabDevice[]): void {
    const next = updater(this.devices)
    this.commit(next)
  }

  private updateDevice(deviceId: string, patch: (device: LabDevice) => LabDevice): void {
    this.replace((current) => updateDeviceInList(current, deviceId, patch))
  }

  private patchChannels(
    deviceId: string,
    buildChannels: (device: LabDevice) => Channel[],
  ): void {
    this.updateDevice(deviceId, (device) => {
      const channels = reconcileChannels(device.channels, buildChannels(device))
      return channels === device.channels ? device : { ...device, channels }
    })
  }

  private syncPolling(): void {
    if (this.devices.length === 0) {
      this.stopPolling()
      return
    }
    if (this.pollTimer === null) {
      this.startPolling()
    }
  }

  private startPolling(): void {
    if (this.pollTimer !== null) return
    void this.pollAll()
    this.pollTimer = window.setInterval(() => {
      void this.pollAll()
    }, DEVICE_POLL_INTERVAL_MS)
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  private async pollAll(): Promise<void> {
    if (this.pollInFlight || this.devices.length === 0) return

    this.pollInFlight = true
    const snapshot = this.devices

    try {
      const results = await Promise.all(
        snapshot.map(async (device) => {
          try {
            const [channels, telemetry] = await Promise.all([
              pollDeviceChannels(device.transport, device.channels),
              pollDeviceTelemetry(device.transport),
            ])
            return { deviceId: device.id, channels, telemetry, ok: true as const }
          } catch {
            return { deviceId: device.id, ok: false as const }
          }
        }),
      )

      this.replace((current) => {
        let changed = false
        const next = current.map((device) => {
          const result = results.find((entry) => entry.deviceId === device.id)
          if (!result?.ok) return device

          const mergedChannels = this.pendingOutput.merge(device.id, result.channels)
          const channels = reconcileChannels(device.channels, mergedChannels)
          const telemetryChanged = !telemetryEqual(device.telemetry, result.telemetry)

          if (channels === device.channels && !telemetryChanged) return device

          changed = true
          return {
            ...device,
            channels,
            telemetry: telemetryChanged ? result.telemetry : device.telemetry,
          }
        })
        return changed ? next : current
      })
    } finally {
      this.pollInFlight = false
    }
  }

  async connect(setConnecting: (value: boolean) => void): Promise<void> {
    if (this.devices.length >= MAX_DEVICES) {
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

      const colorSlot = acquireColorSlot(
        probed.serialNumber,
        this.devices,
        this.serialColorSlots,
      )
      rememberColorSlot(this.serialColorSlots, probed.serialNumber, colorSlot)
      await applyDeviceColorScheme(transport, colorSlot)
      const channels = await pollDeviceChannels(transport, probed.channels)
      const telemetry = await pollDeviceTelemetry(transport).catch(() => EMPTY_TELEMETRY)

      this.replace((current) => [
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
  }

  async disconnect(deviceId: string): Promise<void> {
    const device = this.devices.find((entry) => entry.id === deviceId)
    if (!device) return

    await device.transport.close()
    this.pendingOutput.clearDevice(deviceId)
    deviceSession.remove(deviceId)
    this.replace((current) => current.filter((entry) => entry.id !== deviceId))

    notifications.show({
      id: 'device-disconnected',
      title: 'Device disconnected',
      message: `${device.name} (${device.serialNumber}) removed.`,
      color: 'gray',
    })
  }

  async toggleChannelOutput(deviceId: string, channelIdentifier: string): Promise<void> {
    const device = this.devices.find((entry) => entry.id === deviceId)
    if (!device) return

    const channel = device.channels.find((entry) => entry.identifier === channelIdentifier)
    if (!channel) return

    const nextActive = !channel.active
    const priorChannel = channel

    this.pendingOutput.set(deviceId, channelIdentifier, nextActive)
    this.patchChannels(deviceId, (entry) =>
      entry.channels.map((ch) =>
        ch.identifier === channelIdentifier ? adjustChannelForActive(ch, nextActive) : ch,
      ),
    )

    try {
      await setChannelOutput(device.transport, channelIdentifier, nextActive)
      const current = this.devices.find((entry) => entry.id === deviceId)
      if (!current) return
      const polled = await pollDeviceChannels(device.transport, current.channels)
      this.patchChannels(deviceId, () => this.pendingOutput.merge(deviceId, polled))
    } catch {
      this.pendingOutput.clear(deviceId, channelIdentifier)
      this.patchChannels(deviceId, (entry) =>
        entry.channels.map((ch) =>
          ch.identifier === channelIdentifier ? priorChannel : ch,
        ),
      )
      notifications.show({
        id: 'channel-toggle-failed',
        title: 'Channel update failed',
        message: `Could not ${nextActive ? 'enable' : 'disable'} channel ${channelIdentifier}.`,
        color: 'red',
      })
    }
  }

  async updateChannelSetpoint(
    deviceId: string,
    channelIdentifier: string,
    param: SetpointParam,
    value: number,
  ): Promise<void> {
    const device = this.devices.find((entry) => entry.id === deviceId)
    if (!device) return

    try {
      await setChannelSetpoint(device.transport, channelIdentifier, param, value)
      const polled = await pollDeviceChannels(device.transport, device.channels)
      this.patchChannels(deviceId, () => this.pendingOutput.merge(deviceId, polled))
    } catch {
      notifications.show({
        id: 'setpoint-update-failed',
        title: 'Setpoint update failed',
        message: `Could not update ${param} for channel ${channelIdentifier}.`,
        color: 'red',
      })
    }
  }

  async disableAllOutputs(): Promise<void> {
    const snapshot = this.devices
    if (snapshot.length === 0) return

    for (const device of snapshot) {
      this.pendingOutput.setMany(
        device.id,
        device.channels.map((channel) => channel.identifier),
        false,
      )
    }

    this.replace((current) =>
      patchDeviceList(current, (device) => {
        const channels = reconcileChannels(
          device.channels,
          device.channels.map((channel) => adjustChannelForActive(channel, false)),
        )
        return channels === device.channels ? device : { ...device, channels }
      }),
    )

    try {
      await Promise.all(snapshot.map((device) => disableAllChannels(device.transport)))

      const refreshed = await Promise.all(
        snapshot.map(async (device) => ({
          deviceId: device.id,
          channels: await pollDeviceChannels(device.transport, device.channels),
        })),
      )

      this.replace((current) => {
        let changed = false
        const next = current.map((device) => {
          const update = refreshed.find((entry) => entry.deviceId === device.id)
          if (!update) return device

          const channels = reconcileChannels(
            device.channels,
            this.pendingOutput.merge(device.id, update.channels),
          )
          if (channels === device.channels) return device

          changed = true
          return { ...device, channels }
        })
        return changed ? next : current
      })
    } catch {
      this.pendingOutput.clearAll()
      this.commit(snapshot)
      notifications.show({
        id: 'disable-all-failed',
        title: 'Disable all failed',
        message: 'Could not turn off all channel outputs.',
        color: 'red',
      })
    }
  }
  resume(): void {
    this.syncPolling()
  }
}

export const deviceRuntime = new DeviceRuntime()

if (deviceRuntime.getSnapshot().length > 0) {
  deviceRuntime.resume()
}
