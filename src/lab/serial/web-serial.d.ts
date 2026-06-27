interface SerialPortRequestOptions {
  filters?: SerialPortFilter[]
}

interface SerialPortFilter {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialOptions {
  baudRate: number
  bufferSize?: number
  dataBits?: number
  flowControl?: 'none' | 'hardware'
  parity?: 'none' | 'even' | 'odd'
  stopBits?: number
}

interface SerialOutputSignals {
  dataTerminalReady?: boolean
  requestToSend?: boolean
  break?: boolean
}

interface SerialInputSignals {
  dataCarrierDetect: boolean
  clearToSend: boolean
  ringIndicator: boolean
  dataSetReady: boolean
}

interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null
  open(options: SerialOptions): Promise<void>
  close(): Promise<void>
  getInfo(): SerialPortInfo
  setSignals?(signals: SerialOutputSignals): Promise<void>
  getSignals?(): Promise<SerialInputSignals>
}

interface SerialPortDisconnectEvent extends Event {
  readonly port: SerialPort
}

interface Serial {
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>
  getPorts(): Promise<SerialPort[]>
  addEventListener(
    type: 'disconnect',
    listener: (event: SerialPortDisconnectEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void
  removeEventListener(
    type: 'disconnect',
    listener: (event: SerialPortDisconnectEvent) => void,
    options?: boolean | EventListenerOptions,
  ): void
}

interface Navigator {
  readonly serial: Serial
}
