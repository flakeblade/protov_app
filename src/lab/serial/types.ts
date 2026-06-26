import {
  PROTOV_USB_PRODUCT_ID,
  PROTOV_USB_VENDOR_ID,
} from './constants'

export interface SerialTransport {
  readonly label: string
  open(baudRate?: number): Promise<void>
  close(): Promise<void>
  query(command: string, timeoutMs?: number): Promise<string>
  write(command: string): Promise<void>
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator
}

export function formatUsbPortLabel(port: SerialPort): string {
  const info = port.getInfo()
  if (
    info.usbVendorId === PROTOV_USB_VENDOR_ID &&
    info.usbProductId === PROTOV_USB_PRODUCT_ID
  ) {
    return 'ProtoV MINI (WebSerial)'
  }
  if (info.usbVendorId != null && info.usbProductId != null) {
    const vendor = info.usbVendorId.toString(16).padStart(4, '0')
    const product = info.usbProductId.toString(16).padStart(4, '0')
    return `USB ${vendor}:${product}`
  }
  return 'Serial port'
}
