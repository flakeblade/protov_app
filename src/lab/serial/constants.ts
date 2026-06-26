export const PROTOV_MANUFACTURER = 'Flake-Blade'
export const PROTOV_MODEL = 'ProtoV-MINI'
export const DEFAULT_BAUD_RATE = 115200

export interface IdnResponse {
  manufacturer: string
  model: string
  serial: string
  fwVersion: string
  hwVersion: string
}

export function parseIdn(raw: string): IdnResponse | null {
  const trimmed = raw.trim()
  const parts = trimmed.split(',')
  if (parts.length < 5) return null
  const [manufacturer, model, serial, fwVersion, hwVersion] = parts
  if (!manufacturer || !model || !serial || !fwVersion || !hwVersion) return null
  return { manufacturer, model, serial, fwVersion, hwVersion }
}

export function isCompatiblePowerSupply(idn: IdnResponse): boolean {
  return idn.manufacturer === PROTOV_MANUFACTURER && idn.model === PROTOV_MODEL
}

export const DEVICE_DESCRIPTION =
  'Dual-channel, USB-C powered, credit card-sized lab power supply for electronics prototyping and field testing.'

export const CHANNEL_COLORS: Record<string, string> = {
  A: 'red',
  B: 'blue',
}

export const CHANNEL_IDENTIFIERS = ['A', 'B'] as const
