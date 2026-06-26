import type { SerialTransport } from '../serial/types'
import type { DeviceHealth, DeviceInputPower, DeviceTemperatures } from '../telemetry/types'

export interface DeviceTelemetry {
  temperatures: DeviceTemperatures
  input: DeviceInputPower
  health: DeviceHealth
}

export const EMPTY_TELEMETRY: DeviceTelemetry = {
  temperatures: { chA: 0, chB: 0, mcu: 0 },
  input: { type: 'pd', voltage: 0, current: 0 },
  health: { senseOk: false, converterOk: false },
}

function parseBoolFlag(raw: string): boolean {
  const trimmed = raw.trim()
  return trimmed === '1' || trimmed.toUpperCase() === 'ON' || trimmed.toUpperCase() === 'TRUE'
}

export function parseRegisterDumpResponse(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.includes('|')) {
    return trimmed.split('|').join('\n')
  }
  return trimmed
}

export function parseTelemetrySnapshot(raw: string): DeviceTelemetry {
  const parts = raw.trim().split(',')
  if (parts.length < 8) {
    throw new Error(`Invalid TELEM? response: ${raw}`)
  }

  const [chA, chB, mcu, inputType, inputVoltage, inputCurrent, senseOk, converterOk] = parts
  const type = inputType?.trim().toUpperCase() === 'STD' ? 'standard' : 'pd'

  return {
    temperatures: {
      chA: Number.parseFloat(chA),
      chB: Number.parseFloat(chB),
      mcu: Number.parseFloat(mcu),
    },
    input: {
      type,
      voltage: Number.parseFloat(inputVoltage),
      current: Number.parseFloat(inputCurrent),
    },
    health: {
      senseOk: parseBoolFlag(senseOk),
      converterOk: parseBoolFlag(converterOk),
    },
  }
}

export async function pollDeviceTelemetry(transport: SerialTransport): Promise<DeviceTelemetry> {
  const raw = await transport.query('TELEM?')
  return parseTelemetrySnapshot(raw)
}

export async function queryRegisterDump(
  transport: SerialTransport,
  chip: 'ina226' | 'tps55289',
  channel: 'A' | 'B',
): Promise<string> {
  const scpiChannel = channel === 'A' ? 'CHA' : 'CHB'
  const command =
    chip === 'ina226' ? `INA226:REG? ${scpiChannel}` : `TPS55289:REG? ${scpiChannel}`
  const raw = await transport.query(command)
  return parseRegisterDumpResponse(raw)
}

export function scpiRegisterDumpCommand(chip: 'ina226' | 'tps55289', channel: 'A' | 'B'): string {
  const scpiChannel = channel === 'A' ? 'CHA' : 'CHB'
  return chip === 'ina226' ? `INA226:REG? ${scpiChannel}` : `TPS55289:REG? ${scpiChannel}`
}

export function linkKindFromTransport(label: string): 'mock-bridge' | 'web-serial' | 'unknown' {
  if (label.includes('Mock') || label.includes('bridge')) return 'mock-bridge'
  if (label.includes('WebSerial') || label.startsWith('USB ')) return 'web-serial'
  return 'unknown'
}

export function linkDescription(label: string, baudRate: number): string {
  const kind = linkKindFromTransport(label)
  if (kind === 'mock-bridge') {
    return `${label} @ ${baudRate} baud (WebSocket SCPI bridge)`
  }
  if (kind === 'web-serial') {
    return `${label} @ ${baudRate} baud (Web Serial)`
  }
  return `${label} @ ${baudRate} baud`
}
