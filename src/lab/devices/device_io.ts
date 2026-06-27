import type { Channel } from '../components/channel_chip'
import { CHANNEL_IDENTIFIERS } from '../serial/constants'
import type { SerialTransport } from '../serial/types'
import {
  clampU8,
  formatColrScpi,
  mantineColorToRgb,
  parseColrScpi,
  rgbToNearestChannelColor,
  type ChannelColor,
  type ChannelIdentifier,
} from './channel-colors'
import { colorPairForSlot, defaultColorForChannel } from './device-colors'

const SCPI_CHANNELS = ['CH1', 'CH2'] as const

const CHANNEL_MAP: Record<string, (typeof SCPI_CHANNELS)[number]> = {
  A: 'CH1',
  B: 'CH2',
}

export const DEVICE_POLL_INTERVAL_MS = 400
export const VOLTAGE_MAX = 20
export const CURRENT_MAX = 5

export type SetpointParam = 'voltage' | 'current' | 'ovp' | 'ocp'

export interface DeviceDisplaySettings {
  lcdBrightness: number
  ledBrightness: number
}

export const DEFAULT_DISPLAY_SETTINGS: DeviceDisplaySettings = {
  lcdBrightness: 128,
  ledBrightness: 255,
}

async function queryNumber(transport: SerialTransport, command: string): Promise<number> {
  const raw = await transport.query(command)
  const value = Number.parseFloat(raw)
  if (Number.isNaN(value)) {
    throw new Error(`Invalid numeric response for ${command}: ${raw}`)
  }
  return value
}

async function queryU8(transport: SerialTransport, command: string): Promise<number> {
  const raw = (await transport.query(command)).trim()
  const value = Number.parseInt(raw, 10)
  if (Number.isNaN(value) || value < 0 || value > 255) {
    throw new Error(`Invalid u8 response for ${command}: ${raw}`)
  }
  return value
}

async function queryOutputState(transport: SerialTransport, scpiChannel: string): Promise<boolean> {
  const raw = (await transport.query(`OUTP? ${scpiChannel}`)).trim().toUpperCase()
  return raw === 'ON' || raw === '1'
}

async function queryChannelColor(
  transport: SerialTransport,
  scpiChannel: string,
): Promise<ChannelColor> {
  const raw = (await transport.query(`${scpiChannel}:COLR?`)).trim()
  const rgb = parseColrScpi(raw)
  return rgbToNearestChannelColor(rgb.r, rgb.g, rgb.b)
}

async function readChannelState(
  transport: SerialTransport,
  scpiChannel: (typeof SCPI_CHANNELS)[number],
  identifier: string,
  prior?: Channel,
): Promise<Channel> {
  const outputOn = await queryOutputState(transport, scpiChannel)
  const voltageSet = await queryNumber(transport, `${scpiChannel}:VOLT?`)
  const currentSet = await queryNumber(transport, `${scpiChannel}:CURR?`)
  const ovp = await queryNumber(transport, `${scpiChannel}:OVP?`)
  const ocp = await queryNumber(transport, `${scpiChannel}:OCP?`)

  let color: ChannelColor
  try {
    color = await queryChannelColor(transport, scpiChannel)
  } catch {
    color = prior?.color ?? defaultColorForChannel(0, identifier)
  }

  const measuredVoltage = outputOn
    ? await queryNumber(transport, `MEAS:VOLT? ${scpiChannel}`)
    : 0
  const measuredCurrent = outputOn
    ? await queryNumber(transport, `MEAS:CURR? ${scpiChannel}`)
    : 0

  return {
    identifier,
    color,
    voltage: outputOn ? measuredVoltage : voltageSet,
    current: outputOn ? measuredCurrent : currentSet,
    measuredVoltage,
    measuredCurrent,
    voltageSet,
    currentSet,
    ovp,
    ocp,
    active: outputOn,
  }
}

export async function applyDeviceColorScheme(
  transport: SerialTransport,
  slotIndex: number,
): Promise<void> {
  const scheme = colorPairForSlot(slotIndex)
  for (const identifier of CHANNEL_IDENTIFIERS) {
    const color = scheme[identifier as ChannelIdentifier]
    await setChannelColor(transport, identifier, color)
  }
}

export async function pollDeviceChannels(
  transport: SerialTransport,
  previous: Channel[],
): Promise<Channel[]> {
  const updated: Channel[] = []

  for (let index = 0; index < SCPI_CHANNELS.length; index += 1) {
    const scpiChannel = SCPI_CHANNELS[index]
    const identifier = CHANNEL_IDENTIFIERS[index]
    const prior = previous.find((channel) => channel.identifier === identifier)
    updated.push(await readChannelState(transport, scpiChannel, identifier, prior))
  }

  return updated
}

export async function pollDeviceDisplaySettings(
  transport: SerialTransport,
): Promise<DeviceDisplaySettings> {
  const [lcdBrightness, ledBrightness] = await Promise.all([
    queryLcdBrightness(transport),
    queryLedBrightness(transport),
  ])
  return { lcdBrightness, ledBrightness }
}

export async function disableAllChannels(transport: SerialTransport): Promise<void> {
  for (const scpiChannel of SCPI_CHANNELS) {
    await transport.write(`OUTP ${scpiChannel},OFF`)
  }
}

export async function setChannelOutput(
  transport: SerialTransport,
  channelIdentifier: string,
  active: boolean,
): Promise<void> {
  const scpiChannel = CHANNEL_MAP[channelIdentifier]
  if (!scpiChannel) {
    throw new Error(`Unknown channel identifier: ${channelIdentifier}`)
  }
  await transport.write(`OUTP ${scpiChannel},${active ? 'ON' : 'OFF'}`)
}

export async function setChannelSetpoint(
  transport: SerialTransport,
  channelIdentifier: string,
  param: SetpointParam,
  value: number,
): Promise<void> {
  const scpiChannel = CHANNEL_MAP[channelIdentifier]
  if (!scpiChannel) {
    throw new Error(`Unknown channel identifier: ${channelIdentifier}`)
  }

  const commandMap: Record<SetpointParam, string> = {
    voltage: `${scpiChannel}:VOLT ${value.toFixed(3)}`,
    current: `${scpiChannel}:CURR ${value.toFixed(3)}`,
    ovp: `${scpiChannel}:OVP ${value.toFixed(3)}`,
    ocp: `${scpiChannel}:OCP ${value.toFixed(3)}`,
  }
  await transport.write(commandMap[param])
}

export async function setChannelColor(
  transport: SerialTransport,
  channelIdentifier: string,
  color: ChannelColor,
): Promise<void> {
  const scpiChannel = CHANNEL_MAP[channelIdentifier]
  if (!scpiChannel) {
    throw new Error(`Unknown channel identifier: ${channelIdentifier}`)
  }
  const rgb = mantineColorToRgb(color)
  await transport.write(`${scpiChannel}:COLR ${formatColrScpi(rgb)}`)
}

export async function queryLcdBrightness(transport: SerialTransport): Promise<number> {
  return queryU8(transport, 'LCD:BRIG?')
}

export async function setLcdBrightness(transport: SerialTransport, value: number): Promise<void> {
  await transport.write(`LCD:BRIG ${clampU8(value)}`)
}

export async function queryLedBrightness(transport: SerialTransport): Promise<number> {
  return queryU8(transport, 'LED:BRIG?')
}

export async function setLedBrightness(transport: SerialTransport, value: number): Promise<void> {
  await transport.write(`LED:BRIG ${clampU8(value)}`)
}

export function scpiChannelForIdentifier(identifier: string): string | undefined {
  return CHANNEL_MAP[identifier]
}
