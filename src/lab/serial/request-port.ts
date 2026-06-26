import { PROTOV_WEB_SERIAL_FILTERS } from './constants'
import { serialDebug, serialDebugTransportContext } from './serial-debug'
import type { SerialTransport } from './types'
import { formatUsbPortLabel, isWebSerialSupported } from './types'
import { WebBridgeTransport } from './web-bridge-transport'
import { WebSerialTransport } from './webserial-transport'

export type DevTransport = 'mock' | 'webserial'

export function devTransport(): DevTransport {
  if (
    import.meta.env.VITE_PROTOV_DEV_TRANSPORT === 'webserial' ||
    import.meta.env.MODE === 'webserial'
  ) {
    return 'webserial'
  }
  return 'mock'
}

export function usesMockTransport(): boolean {
  return import.meta.env.DEV && devTransport() === 'mock'
}

export function usesWebSerialTransport(): boolean {
  return !import.meta.env.DEV || devTransport() === 'webserial'
}

export async function requestSerialPort(): Promise<SerialTransport> {
  serialDebug('requestSerialPort', serialDebugTransportContext())

  if (usesMockTransport()) {
    serialDebug('transport selected', 'mock WebSocket bridge')
    return WebBridgeTransport.connect()
  }

  serialDebug('transport selected', 'WebSerial')
  return requestWebSerialPort()
}

async function requestWebSerialPort(): Promise<SerialTransport> {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial is not supported in this browser')
  }

  serialDebug('requestPort: opening Chrome picker', { filters: PROTOV_WEB_SERIAL_FILTERS })
  const port = await navigator.serial.requestPort({ filters: PROTOV_WEB_SERIAL_FILTERS })
  const label = formatUsbPortLabel(port)
  serialDebug('requestPort: selected', { label, portInfo: port.getInfo() })
  return new WebSerialTransport(port, label)
}
