import type { SerialTransport } from './types'
import { formatUsbPortLabel, isWebSerialSupported } from './types'
import { WebBridgeTransport } from './web-bridge-transport'
import { WebSerialTransport } from './webserial-transport'

export async function requestSerialPort(): Promise<SerialTransport> {
  if (import.meta.env.DEV) {
    return WebBridgeTransport.connect()
  }

  if (!isWebSerialSupported()) {
    throw new Error('Web Serial is not supported in this browser')
  }

  const port = await navigator.serial.requestPort()
  return new WebSerialTransport(port, formatUsbPortLabel(port))
}
