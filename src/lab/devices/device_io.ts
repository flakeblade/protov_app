import type { Channel } from '../components/channel_chip'
import { CHANNEL_IDENTIFIERS } from '../serial/constants'
import type { SerialTransport } from '../serial/types'
import {
  colorSchemeForSlot,
  mantineColorFromScpi,
  type ChannelIdentifier,
} from './device-colors'

const SCPI_CHANNELS = ['CH1', 'CH2'] as const

const CHANNEL_MAP: Record<string, (typeof SCPI_CHANNELS)[number]> = {
  A: 'CH1',
  B: 'CH2',
}

export const DEVICE_POLL_INTERVAL_MS = 400
export const VOLTAGE_MAX = 20
export const CURRENT_MAX = 5

export type SetpointParam = 'voltage' | 'current' | 'ovp' | 'ocp'

async function queryNumber(transport: SerialTransport, command: string): Promise<number> {
  const raw = await transport.query(command)
  const value = Number.parseFloat(raw)
  if (Number.isNaN(value)) {
    throw new Error(`Invalid numeric response for ${command}: ${raw}`)
  }
  return value
}

async function queryOutputState(transport: SerialTransport, scpiChannel: string): Promise<boolean> {
  const raw = (await transport.query(`OUTP? ${scpiChannel}`)).trim().toUpperCase()
  return raw === 'ON' || raw === '1'
}

async function queryChannelColor(transport: SerialTransport, scpiChannel: string): Promise<string> {
  const raw = (await transport.query(`${scpiChannel}:COLR?`)).trim()
  return mantineColorFromScpi(raw)
}

function defaultChannel(identifier: string): Channel {
  return {
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
  }
}

async function readChannelState(
  transport: SerialTransport,
  scpiChannel: (typeof SCPI_CHANNELS)[number],
  identifier: string,
  prior?: Channel,
): Promise<Channel> {
  const fallback = prior ?? defaultChannel(identifier)
  const outputOn = await queryOutputState(transport, scpiChannel)
  const voltageSet = await queryNumber(transport, `${scpiChannel}:VOLT?`)
  const currentSet = await queryNumber(transport, `${scpiChannel}:CURR?`)
  const ovp = await queryNumber(transport, `${scpiChannel}:OVP?`)
  const ocp = await queryNumber(transport, `${scpiChannel}:OCP?`)
  const color = await queryChannelColor(transport, scpiChannel)

  const measuredVoltage = outputOn
    ? await queryNumber(transport, `MEAS:VOLT? ${scpiChannel}`)
    : 0
  const measuredCurrent = outputOn
    ? await queryNumber(transport, `MEAS:CURR? ${scpiChannel}`)
    : 0

  return {
    identifier,
    color: color || fallback.color,
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
  const scheme = colorSchemeForSlot(slotIndex)
  for (const identifier of CHANNEL_IDENTIFIERS) {
    const scpiChannel = CHANNEL_MAP[identifier]
    const scpiColor = scheme[identifier as ChannelIdentifier]
    await transport.write(`${scpiChannel}:COLR ${scpiColor}`)
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
  color: string,
): Promise<void> {
  const scpiChannel = CHANNEL_MAP[channelIdentifier]
  if (!scpiChannel) {
    throw new Error(`Unknown channel identifier: ${channelIdentifier}`)
  }
  await transport.write(`${scpiChannel}:COLR ${color.trim().toUpperCase()}`)
}

export function scpiChannelForIdentifier(identifier: string): string | undefined {
  return CHANNEL_MAP[identifier]
}
