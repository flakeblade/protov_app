import { DEFAULT_BAUD_RATE, USB_CDC_SETTLE_MS } from './constants'
import { formatSerialOpenError } from './serial-errors'
import { serialDebug, serialWarn } from './serial-debug'
import { formatScpiCommand, takeScpiLine } from './scpi-lines'
import type { SerialTransport } from './types'

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

    if (portIsOpen(this.port)) {
      serialWarn('open: port was open externally, closing first')
      await this.forceClosePort()
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
      serialWarn('open: failed', error)
      throw formatSerialOpenError(error)
    }

    // PyVISA asserts DTR on ASRL open; embassy-usb CDC wait_connection() needs it.
    await this.assertHostReadySignals()

    this.isOpen = true
    this.readBuffer = ''
    this.startReadLoop()

    serialDebug('open: waiting for USB CDC settle', { ms: USB_CDC_SETTLE_MS })
    await sleep(USB_CDC_SETTLE_MS)
    serialDebug('open: success')
  }

  async close(): Promise<void> {
    serialDebug('close', { label: this.label })
    this.isOpen = false
    this.rejectAllWaiters(new Error('Serial port closed'))
    this.readBuffer = ''
    this.pendingLines = []

    if (this.port.readable) {
      const reader = this.port.readable.getReader()
      await reader.cancel().catch(() => undefined)
      reader.releaseLock()
    }

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
    const writer = this.port.writable.getWriter()
    try {
      await writer.write(textEncoder.encode(payload))
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
    this.readLoopPromise = (async () => {
      try {
        while (this.isOpen) {
          const { value, done } = await reader.read()
          if (done) {
            serialWarn('readLoop: port stream closed')
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
        }
      } finally {
        reader.releaseLock()
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

  private readLine(timeoutMs: number): Promise<string> {
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
