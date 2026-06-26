export const PROTOV_MANUFACTURER = 'FBRD Inc.'
export const PROTOV_MODEL = 'ProtoV MINI'
export const DEFAULT_BAUD_RATE = 115200

/** Time for the host to finish USB SET_CONFIGURATION after DTR (firmware USB_ENUM_GRACE_MS). */
export const USB_CDC_SETTLE_MS = 250

/** Official ProtoV MINI USB identifiers. */
export const PROTOV_USB_VENDOR_ID = 0x2e8a
export const PROTOV_USB_PRODUCT_ID = 0x111f

export const PROTOV_WEB_SERIAL_FILTERS: SerialPortFilter[] = [
  { usbVendorId: PROTOV_USB_VENDOR_ID, usbProductId: PROTOV_USB_PRODUCT_ID },
]

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
