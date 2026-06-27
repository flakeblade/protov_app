import type { Channel } from '../components/channel_chip'
import type { DeviceTelemetry } from './telemetry_io'
import type { LabDevice } from './device_types'

export function channelEqual(a: Channel, b: Channel): boolean {
  return (
    a.identifier === b.identifier &&
    a.color === b.color &&
    a.voltage === b.voltage &&
    a.current === b.current &&
    a.measuredVoltage === b.measuredVoltage &&
    a.measuredCurrent === b.measuredCurrent &&
    a.voltageSet === b.voltageSet &&
    a.currentSet === b.currentSet &&
    a.ovp === b.ovp &&
    a.ocp === b.ocp &&
    a.active === b.active
  )
}

export function reconcileChannels(previous: Channel[], incoming: Channel[]): Channel[] {
  if (previous.length !== incoming.length) return incoming

  let changed = false
  const next = incoming.map((channel, index) => {
    const prior = previous[index]
    if (prior && channelEqual(prior, channel)) return prior
    changed = true
    return channel
  })

  return changed ? next : previous
}

export function telemetryEqual(a: DeviceTelemetry, b: DeviceTelemetry): boolean {
  return (
    a.temperatures.chA === b.temperatures.chA &&
    a.temperatures.chB === b.temperatures.chB &&
    a.temperatures.mcu === b.temperatures.mcu &&
    a.input.type === b.input.type &&
    a.input.voltage === b.input.voltage &&
    a.input.current === b.input.current &&
    a.health.senseOk === b.health.senseOk &&
    a.health.converterOk === b.health.converterOk
  )
}

export function updateDeviceInList(
  devices: LabDevice[],
  deviceId: string,
  patch: (device: LabDevice) => LabDevice,
): LabDevice[] {
  let changed = false
  const next = devices.map((device) => {
    if (device.id !== deviceId) return device
    const updated = patch(device)
    if (updated === device) return device
    changed = true
    return updated
  })
  return changed ? next : devices
}

export function patchDeviceList(
  devices: LabDevice[],
  patch: (device: LabDevice) => LabDevice,
): LabDevice[] {
  let changed = false
  const next = devices.map((device) => {
    const updated = patch(device)
    if (updated === device) return device
    changed = true
    return updated
  })
  return changed ? next : devices
}
