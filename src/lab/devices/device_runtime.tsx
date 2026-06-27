import { notifications } from '@mantine/notifications'
import {
  IconActivity,
  IconBolt,
  IconPlugConnected,
  IconPlugConnectedX,
  IconTemperature,
} from '@tabler/icons-react'

import type { Channel } from '../components/channel_chip'

import type { ChannelColor } from './channel-colors'
import {
  FAULT_NOTIFICATIONS,
  isChannelFaultMode,
  type ChannelFaultMode,
} from './channel-mode'

import {
  DEFAULT_DISPLAY_SETTINGS,
  DEVICE_POLL_INTERVAL_MS,
  applyDeviceColorScheme,
  disableAllChannels,
  pollDeviceChannels,
  pollDeviceDisplaySettings,
  setChannelColor,
  setChannelOutput,
  setChannelSetpoint,
  setLcdBrightness,
  setLedBrightness,
  type SetpointParam,
} from './device_io'
import { EMPTY_TELEMETRY, pollDeviceTelemetry } from './telemetry_io'
import { MAX_DEVICES, acquireColorSlot, rememberColorSlot } from './device-colors'
import { adjustChannelForActive, PendingChannelOutput } from './channel-output-pending'
import { PendingDisplaySettings } from './display-settings-pending'
import {
  displayEqual,
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

type DisconnectReason = 'manual' | 'lost'

const POLL_FAILURES_BEFORE_LOST = 3

function faultNotificationIcon(mode: ChannelFaultMode) {
  switch (mode) {
    case 'OCP':
      return <IconActivity size={18} />
    case 'OVP':
      return <IconBolt size={18} />
    case 'TEMP':
      return <IconTemperature size={18} />
  }
}

class DeviceRuntime {
  private devices: LabDevice[] = deviceSession.list()
  private readonly listeners = new Set<Listener>()
  private readonly pendingOutput = new PendingChannelOutput()
  private readonly pendingDisplay = new PendingDisplaySettings()
  private readonly knownChannelModes = new Map<string, string>()
  private readonly serialColorSlots = new Map<string, number>()
  private readonly pollFailures = new Map<string, number>()
  private readonly disconnecting = new Set<string>()
  private readonly linkUnsubscribers = new Map<string, () => void>()
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

  private registerDeviceLink(device: LabDevice): void {
    this.unregisterDeviceLink(device.id)
    const unsubscribe = device.transport.onConnectionLost?.(() => {
      void this.handleConnectionLost(device.id)
    })
    if (unsubscribe) {
      this.linkUnsubscribers.set(device.id, unsubscribe)
    }
  }

  private unregisterDeviceLink(deviceId: string): void {
    const unsubscribe = this.linkUnsubscribers.get(deviceId)
    unsubscribe?.()
    this.linkUnsubscribers.delete(deviceId)
  }

  private async removeDevice(deviceId: string, reason: DisconnectReason): Promise<void> {
    if (this.disconnecting.has(deviceId)) return

    const device = this.devices.find((entry) => entry.id === deviceId)
    if (!device) return

    this.disconnecting.add(deviceId)
    this.unregisterDeviceLink(deviceId)
    this.pollFailures.delete(deviceId)
    this.pendingOutput.clearDevice(deviceId)
    this.pendingDisplay.clearDevice(deviceId)
    for (const key of [...this.knownChannelModes.keys()]) {
      if (key.startsWith(`${deviceId}:`)) {
        this.knownChannelModes.delete(key)
      }
    }

    try {
      await device.transport.close()
    } catch {
      // The port may already be gone after an unplug.
    }

    deviceSession.remove(deviceId)
    this.replace((current) => current.filter((entry) => entry.id !== deviceId))

    notifications.show({
      id: `device-removed-${deviceId}`,
      title: reason === 'manual' ? 'Device disconnected' : 'Device connection lost',
      message:
        reason === 'manual'
          ? `${device.name} (${device.serialNumber}) was disconnected.`
          : `${device.name} (${device.serialNumber}) was unplugged or lost.`,
      color: reason === 'manual' ? 'gray' : 'orange',
      icon: <IconPlugConnectedX size={18} />,
    })

    this.disconnecting.delete(deviceId)
  }

  handleConnectionLost(deviceId: string): void {
    if (this.disconnecting.has(deviceId)) return
    void this.removeDevice(deviceId, 'lost')
  }

  private notifyChannelFaults(
    device: LabDevice,
    previousChannels: Channel[],
    nextChannels: Channel[],
  ): void {
    for (const channel of nextChannels) {
      const key = `${device.id}:${channel.identifier}`
      const previous = previousChannels.find((entry) => entry.identifier === channel.identifier)
      const priorMode = previous?.mode ?? this.knownChannelModes.get(key)

      if (
        isChannelFaultMode(channel.mode) &&
        priorMode !== channel.mode
      ) {
        const details = FAULT_NOTIFICATIONS[channel.mode]
        notifications.show({
          id: `channel-fault-${device.id}-${channel.identifier}-${channel.mode}`,
          title: `${details.title} — Channel ${channel.identifier}`,
          message: details.message(device.name, channel.identifier),
          color: channel.color,
          icon: faultNotificationIcon(channel.mode),
        })
      }

      this.knownChannelModes.set(key, channel.mode)
    }
  }

  private async pollAll(): Promise<void> {
    if (this.pollInFlight || this.devices.length === 0) return

    this.pollInFlight = true
    const snapshot = this.devices
    const lostDeviceIds: string[] = []

    try {
      const results = await Promise.all(
        snapshot.map(async (device) => {
          if (this.disconnecting.has(device.id)) {
            return { deviceId: device.id, ok: false as const, lost: false }
          }

          try {
            const [channels, telemetry, display] = await Promise.all([
              pollDeviceChannels(device.transport, device.channels),
              pollDeviceTelemetry(device.transport),
              pollDeviceDisplaySettings(device.transport).catch(() => device.display),
            ])
            this.pollFailures.set(device.id, 0)
            return { deviceId: device.id, channels, telemetry, display, ok: true as const, lost: false }
          } catch {
            const failures = (this.pollFailures.get(device.id) ?? 0) + 1
            this.pollFailures.set(device.id, failures)
            const lost = failures >= POLL_FAILURES_BEFORE_LOST
            if (lost) {
              serialWarn('poll: device presumed lost', { deviceId: device.id, failures })
            }
            return { deviceId: device.id, ok: false as const, lost }
          }
        }),
      )

      for (const result of results) {
        if (result.lost) {
          lostDeviceIds.push(result.deviceId)
        }
      }

      this.replace((current) => {
        let changed = false
        const next = current.map((device) => {
          const result = results.find((entry) => entry.deviceId === device.id)
          if (!result?.ok) return device

          const mergedChannels = this.pendingOutput.merge(device.id, result.channels)
          const channels = reconcileChannels(device.channels, mergedChannels)
          const mergedDisplay = this.pendingDisplay.merge(device.id, result.display)
          const telemetryChanged = !telemetryEqual(device.telemetry, result.telemetry)
          const displayChanged = !displayEqual(device.display, mergedDisplay)

          if (channels !== device.channels) {
            this.notifyChannelFaults(device, device.channels, channels)
          }

          if (channels === device.channels && !telemetryChanged && !displayChanged) return device

          changed = true
          return {
            ...device,
            channels,
            telemetry: telemetryChanged ? result.telemetry : device.telemetry,
            display: displayChanged ? mergedDisplay : device.display,
          }
        })
        return changed ? next : current
      })

      for (const deviceId of lostDeviceIds) {
        void this.removeDevice(deviceId, 'lost')
      }
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
      const display = await pollDeviceDisplaySettings(transport).catch(
        () => DEFAULT_DISPLAY_SETTINGS,
      )

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
          display,
          colorSlot,
          transport,
        },
      ])

      for (const channel of channels) {
        this.knownChannelModes.set(`${probed.serialNumber}:${channel.identifier}`, channel.mode)
      }

      const connected = this.devices.find((entry) => entry.id === probed.serialNumber)
      if (connected) {
        this.registerDeviceLink(connected)
      }

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
    await this.removeDevice(deviceId, 'manual')
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
      if (!this.devices.some((entry) => entry.id === deviceId)) return
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

  async updateChannelColor(
    deviceId: string,
    channelIdentifier: string,
    color: ChannelColor,
  ): Promise<void> {
    const device = this.devices.find((entry) => entry.id === deviceId)
    if (!device) return

    const priorChannel = device.channels.find((entry) => entry.identifier === channelIdentifier)
    if (!priorChannel) return

    this.patchChannels(deviceId, (entry) =>
      entry.channels.map((ch) =>
        ch.identifier === channelIdentifier ? { ...ch, color } : ch,
      ),
    )

    try {
      await setChannelColor(device.transport, channelIdentifier, color)
      const current = this.devices.find((entry) => entry.id === deviceId)
      if (!current) return
      const polled = await pollDeviceChannels(device.transport, current.channels)
      this.patchChannels(deviceId, () => this.pendingOutput.merge(deviceId, polled))
    } catch {
      this.patchChannels(deviceId, (entry) =>
        entry.channels.map((ch) =>
          ch.identifier === channelIdentifier ? priorChannel : ch,
        ),
      )
      notifications.show({
        id: 'channel-color-failed',
        title: 'Color update failed',
        message: `Could not update color for channel ${channelIdentifier}.`,
        color: 'red',
      })
    }
  }

  async updateLcdBrightness(deviceId: string, value: number): Promise<void> {
    const device = this.devices.find((entry) => entry.id === deviceId)
    if (!device) return

    const prior = device.display.lcdBrightness
    this.pendingDisplay.set(deviceId, 'lcdBrightness', value)
    this.updateDevice(deviceId, (entry) => ({
      ...entry,
      display: { ...entry.display, lcdBrightness: value },
    }))

    try {
      await setLcdBrightness(device.transport, value)
    } catch {
      this.pendingDisplay.clear(deviceId, 'lcdBrightness')
      this.updateDevice(deviceId, (entry) => ({
        ...entry,
        display: { ...entry.display, lcdBrightness: prior },
      }))
      notifications.show({
        id: 'lcd-brightness-failed',
        title: 'LCD brightness update failed',
        message: 'Could not update LCD brightness.',
        color: 'red',
      })
    }
  }

  async updateLedBrightness(deviceId: string, value: number): Promise<void> {
    const device = this.devices.find((entry) => entry.id === deviceId)
    if (!device) return

    const prior = device.display.ledBrightness
    this.pendingDisplay.set(deviceId, 'ledBrightness', value)
    this.updateDevice(deviceId, (entry) => ({
      ...entry,
      display: { ...entry.display, ledBrightness: value },
    }))

    try {
      await setLedBrightness(device.transport, value)
    } catch {
      this.pendingDisplay.clear(deviceId, 'ledBrightness')
      this.updateDevice(deviceId, (entry) => ({
        ...entry,
        display: { ...entry.display, ledBrightness: prior },
      }))
      notifications.show({
        id: 'led-brightness-failed',
        title: 'LED brightness update failed',
        message: 'Could not update LED brightness.',
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
    for (const device of this.devices) {
      this.registerDeviceLink(device)
    }
    this.syncPolling()
  }
}

export const deviceRuntime = new DeviceRuntime()

if (deviceRuntime.getSnapshot().length > 0) {
  deviceRuntime.resume()
}
