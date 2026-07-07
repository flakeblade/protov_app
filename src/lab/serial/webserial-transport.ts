import { DEFAULT_BAUD_RATE, USB_CDC_SETTLE_MS } from './constants'
import { formatSerialOpenError } from './serial-errors'
import { serialDebug, serialWarn } from './serial-debug'
import { formatScpiCommand, takeScpiLine } from './scpi-lines'
import type { ConnectionLostHandler, SerialTransport } from './types'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

/** CDC ACM responses arrive in 64-byte USB packets; keep a generous read buffer. */
const READ_BUFFER_SIZE = 4096

interface LineWaiter {
  resolve: (line: string) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

function portIsOpen(port: SerialPort): boolean {
  return port.readable !== null || port.writable !== null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class WebSerialTransport implements SerialTransport {
  readonly label: string
  private port: SerialPort
  private isOpen = false
  private readBuffer = ''
  private pendingLines: string[] = []
  private lineWaiters: LineWaiter[] = []
  private readLoopPromise: Promise<void> | null = null
  private activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private intentionalClose = false
  private connectionLostHandlers = new Set<ConnectionLostHandler>()
  private browserDisconnectListener: ((event: SerialPortDisconnectEvent) => void) | null = null

  constructor(port: SerialPort, label: string) {
    this.port = port
    this.label = label
  }

  async open(baudRate = DEFAULT_BAUD_RATE): Promise<void> {
    serialDebug('open: start', { label: this.label, baudRate, portInfo: this.port.getInfo() })

    if (this.isOpen && portIsOpen(this.port)) {
      serialDebug('open: already open')
      return
    }

    this.intentionalClose = false

    if (portIsOpen(this.port)) {
      serialWarn('open: closing stale port handle before open')
      await releaseSerialPort(this.port)
    }

    try {
      await this.port.open({
        baudRate,
        bufferSize: READ_BUFFER_SIZE,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'InvalidStateError') {
        serialWarn('open: InvalidStateError, releasing port and retrying once')
        await releaseSerialPort(this.port)
        try {
          await this.port.open({
            baudRate,
            bufferSize: READ_BUFFER_SIZE,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            flowControl: 'none',
          })
        } catch (retryError) {
          serialWarn('open: retry failed', retryError)
          throw formatSerialOpenError(retryError)
        }
      } else {
        serialWarn('open: failed', error)
        throw formatSerialOpenError(error)
      }
    }

    // PyVISA asserts DTR on ASRL open; embassy-usb CDC wait_connection() needs it.
    await this.assertHostReadySignals()

    this.isOpen = true
    this.readBuffer = ''
    this.startReadLoop()

    serialDebug('open: waiting for USB CDC settle', { ms: USB_CDC_SETTLE_MS })
    await sleep(USB_CDC_SETTLE_MS)
    this.attachBrowserDisconnectListener()
    serialDebug('open: success')
  }

  onConnectionLost(handler: ConnectionLostHandler): () => void {
    this.connectionLostHandlers.add(handler)
    return () => {
      this.connectionLostHandlers.delete(handler)
    }
  }

  async close(): Promise<void> {
    serialDebug('close', { label: this.label })
    this.intentionalClose = true
    this.detachBrowserDisconnectListener()
    this.isOpen = false
    this.rejectAllWaiters(new Error('Serial port closed'))
    this.readBuffer = ''
    this.pendingLines = []

    await this.cancelActiveReader()
    await this.readLoopPromise?.catch(() => undefined)
    this.readLoopPromise = null
    await this.forceClosePort()
  }

  async write(command: string): Promise<void> {
    if (!this.isOpen || !this.port.writable) {
      throw new Error('Serial port is not open')
    }

    const payload = formatScpiCommand(command)
    serialDebug('tx', payload.slice(0, -1))
    await this.writeRaw(payload)
  }

  async writeBytes(data: Uint8Array): Promise<void> {
    if (!this.isOpen || !this.port.writable) {
      throw new Error('Serial port is not open')
    }
    serialDebug('tx bytes', { length: data.length })
    await this.writeRaw(data)
  }

  private async writeRaw(payload: string | Uint8Array): Promise<void> {
    const writer = this.port.writable!.getWriter()
    try {
      const bytes = typeof payload === 'string' ? textEncoder.encode(payload) : payload
      await writer.write(bytes)
    } finally {
      writer.releaseLock()
    }
  }

  async query(command: string, timeoutMs = 3000): Promise<string> {
    serialDebug('query: start', { command, timeoutMs })
    await this.write(command)
    const response = await this.readLine(timeoutMs)
    serialDebug('query: response', { command, response })
    return response
  }

  async readLine(timeoutMs = 3000): Promise<string> {
    return this.readLineInternal(timeoutMs)
  }

  async drainIncoming(timeoutMs: number): Promise<string[]> {
    const lines = [...this.pendingLines]
    this.pendingLines = []

    while (true) {
      const { line, rest } = takeScpiLine(this.readBuffer)
      if (line === null) break
      this.readBuffer = rest
      if (line.length > 0) lines.push(line)
    }

    if (lines.length > 0 || timeoutMs <= 0) {
      return lines
    }

    try {
      const line = await this.readLineInternal(timeoutMs)
      if (line) lines.push(line)
    } catch {
      // expected when nothing pending
    }
    return lines
  }

  private async assertHostReadySignals(): Promise<void> {
    if (typeof this.port.setSignals !== 'function') {
      serialDebug('open: setSignals unavailable in this browser')
      return
    }

    try {
      await this.port.setSignals({ dataTerminalReady: true, requestToSend: true })
      serialDebug('open: DTR/RTS asserted')
    } catch (error) {
      serialWarn('open: could not assert DTR/RTS', error)
    }
  }

  private startReadLoop(): void {
    if (!this.port.readable) {
      throw new Error('Serial port is not readable')
    }

    const reader = this.port.readable.getReader()
    this.activeReader = reader
    this.readLoopPromise = (async () => {
      try {
        while (this.isOpen) {
          const { value, done } = await reader.read()
          if (done) {
            serialWarn('readLoop: port stream closed')
            void this.handleUnexpectedDisconnect()
            break
          }
          if (!value?.length) continue

          const chunk = textDecoder.decode(value, { stream: true })
          this.readBuffer += chunk
          serialDebug('rx chunk', {
            bytes: value.length,
            text: chunk.replace(/\r/g, '\\r').replace(/\n/g, '\\n'),
            bufferLength: this.readBuffer.length,
          })
          this.dispatchCompleteLines()
        }
      } catch (error) {
        if (this.isOpen) {
          serialWarn('readLoop: failed', error)
          this.rejectAllWaiters(error instanceof Error ? error : new Error(String(error)))
          void this.handleUnexpectedDisconnect()
        }
      } finally {
        reader.releaseLock()
        if (this.activeReader === reader) {
          this.activeReader = null
        }
      }
    })()
  }

  private dispatchCompleteLines(): void {
    while (true) {
      const { line, rest } = takeScpiLine(this.readBuffer)
      if (line === null) break
      this.readBuffer = rest

      // Firmware sends payload in 64-byte packets and a final lone "\n" packet.
      if (line.length === 0) continue

      const waiter = this.lineWaiters.shift()
      if (!waiter) {
        this.pendingLines.push(line)
        continue
      }

      clearTimeout(waiter.timer)
      waiter.resolve(line)
    }
  }

  private readLineInternal(timeoutMs: number): Promise<string> {
    const buffered = this.takeBufferedLine()
    if (buffered !== null) {
      return Promise.resolve(buffered)
    }

    if (!this.isOpen) {
      return Promise.reject(new Error('Serial port is not open'))
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.lineWaiters.findIndex((waiter) => waiter.resolve === resolve)
        if (index >= 0) this.lineWaiters.splice(index, 1)
        serialWarn('readLine: timeout', {
          timeoutMs,
          buffer: this.readBuffer,
          bufferEscaped: this.readBuffer.replace(/\r/g, '\\r').replace(/\n/g, '\\n'),
          pendingWaiters: this.lineWaiters.length,
          pendingLines: this.pendingLines.length,
        })
        reject(new Error(`Timed out waiting for serial response (${timeoutMs} ms)`))
      }, timeoutMs)

      this.lineWaiters.push({ resolve, reject, timer })
      this.dispatchCompleteLines()
    })
  }

  private takeBufferedLine(): string | null {
    if (this.pendingLines.length > 0) {
      return this.pendingLines.shift() ?? null
    }

    while (true) {
      const { line, rest } = takeScpiLine(this.readBuffer)
      if (line === null) return null
      this.readBuffer = rest
      if (line.length > 0) return line
    }
  }

  private rejectAllWaiters(error: Error): void {
    for (const waiter of this.lineWaiters) {
      clearTimeout(waiter.timer)
      waiter.reject(error)
    }
    this.lineWaiters = []
  }

  private attachBrowserDisconnectListener(): void {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) return
    if (this.browserDisconnectListener) return

    this.browserDisconnectListener = (event) => {
      if (event.port !== this.port) return
      serialWarn('browser disconnect event', { label: this.label })
      void this.handleUnexpectedDisconnect()
    }
    navigator.serial.addEventListener('disconnect', this.browserDisconnectListener)
  }

  private detachBrowserDisconnectListener(): void {
    if (
      this.browserDisconnectListener &&
      typeof navigator !== 'undefined' &&
      'serial' in navigator
    ) {
      navigator.serial.removeEventListener('disconnect', this.browserDisconnectListener)
    }
    this.browserDisconnectListener = null
  }

  private async handleUnexpectedDisconnect(): Promise<void> {
    if (this.intentionalClose || !this.isOpen) return

    serialWarn('connection lost', { label: this.label })
    this.isOpen = false
    this.detachBrowserDisconnectListener()
    this.rejectAllWaiters(new Error('Serial port disconnected'))
    this.readBuffer = ''
    this.pendingLines = []

    await this.cancelActiveReader()
    await this.readLoopPromise?.catch(() => undefined)
    this.readLoopPromise = null
    await this.forceClosePort()

    for (const handler of this.connectionLostHandlers) {
      handler()
    }
  }

  private async cancelActiveReader(): Promise<void> {
    const reader = this.activeReader
    if (!reader) return
    await reader.cancel().catch(() => undefined)
  }

  private async forceClosePort(): Promise<void> {
    if (!portIsOpen(this.port)) {
      return
    }

    try {
      await this.port.close()
    } catch {
      // Ignore close races when the OS already released the port.
    }
  }
}

/** Release a Web Serial port handle so it can be opened again after disconnect/reconnect. */
export async function releaseSerialPort(port: SerialPort): Promise<void> {
  if (!portIsOpen(port)) return
  try {
    await port.close()
  } catch {
    // Port may already be closing after an unplug.
  }
}
