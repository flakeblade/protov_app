interface SerialPortRequestOptions {
  filters?: SerialPortFilter[]
}

interface SerialPortFilter {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null
  open(options: SerialOptions): Promise<void>
  close(): Promise<void>
  getInfo(): SerialPortInfo
}

interface SerialOptions {
  baudRate: number
  bufferSize?: number
  dataBits?: number
  flowControl?: 'none' | 'hardware'
  parity?: 'none' | 'even' | 'odd'
  stopBits?: number
}

interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

interface Serial {
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>
  getPorts(): Promise<SerialPort[]>
}

interface Navigator {
  readonly serial: Serial
}
