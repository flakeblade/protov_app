import type { Channel } from '../components/channel_chip'
import { pollDeviceChannels } from '../devices/device_io'
import {
  CHANNEL_IDENTIFIERS,
  DEFAULT_BAUD_RATE,
  DEVICE_DESCRIPTION,
  isCompatiblePowerSupply,
  parseIdn,
  USB_CDC_SETTLE_MS,
} from './constants'
import type { SerialTransport } from './types'
import { serialDebug, serialWarn } from './serial-debug'

export interface ProbedDevice {
  name: string
  port: string
  description: string
  serialNumber: string
  fwVersion: string
  hwVersion: string
  channels: Channel[]
}

export async function probePowerSupply(transport: SerialTransport): Promise<ProbedDevice> {
  serialDebug('probe: *IDN?')
  const idnRaw = await transport.query('*IDN?')
  serialDebug('probe: *IDN? raw', idnRaw)
  const idn = parseIdn(idnRaw)
  if (!idn) {
    serialWarn('probe: invalid *IDN? response', idnRaw)
    throw new Error('Device did not return a valid *IDN? response')
  }
  if (!isCompatiblePowerSupply(idn)) {
    serialWarn('probe: incompatible device', idn)
    throw new Error('INCOMPATIBLE_DEVICE')
  }

  serialDebug('probe: compatible', idn)
  serialDebug('probe: polling channels')
  const prior = CHANNEL_IDENTIFIERS.map((identifier) => ({
    identifier,
    color: identifier === 'A' ? 'red' : 'blue',
    voltage: 0,
    current: 0,
    measuredVoltage: 0,
    measuredCurrent: 0,
    voltageSet: 0,
    currentSet: 0.5,
    ovp: 18,
    ocp: 1,
    active: false,
  }))
  const channels = await pollDeviceChannels(transport, prior)

  return {
    name: idn.model,
    port: transport.label,
    description: DEVICE_DESCRIPTION,
    serialNumber: idn.serial,
    fwVersion: idn.fwVersion,
    hwVersion: idn.hwVersion,
    channels,
  }
}

export async function openAndProbeTransport(transport: SerialTransport): Promise<ProbedDevice> {
  serialDebug('openAndProbe: opening transport')
  await transport.open(DEFAULT_BAUD_RATE)
  serialDebug('openAndProbe: USB CDC settle complete', { ms: USB_CDC_SETTLE_MS })
  try {
    const probed = await probePowerSupply(transport)
    serialDebug('openAndProbe: complete', {
      serial: probed.serialNumber,
      fw: probed.fwVersion,
      channels: probed.channels.length,
    })
    return probed
  } catch (error) {
    serialWarn('openAndProbe: failed', error)
    await transport.close().catch(() => undefined)
    throw error
  }
}
