import type { SerialTransport } from './types'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export class WebSerialTransport implements SerialTransport {
  readonly label: string
  private port: SerialPort
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private readBuffer = ''

  constructor(port: SerialPort, label: string) {
    this.port = port
    this.label = label
  }

  async open(baudRate = 115200): Promise<void> {
    await this.port.open({ baudRate })
    if (!this.port.readable || !this.port.writable) {
      throw new Error('Serial port streams are unavailable')
    }
    this.reader = this.port.readable.getReader()
    this.writer = this.port.writable.getWriter()
  }

  async close(): Promise<void> {
    await this.reader?.cancel()
    this.reader?.releaseLock()
    await this.writer?.close()
    this.writer?.releaseLock()
    await this.port.close()
    this.reader = null
    this.writer = null
    this.readBuffer = ''
  }

  async write(command: string): Promise<void> {
    if (!this.writer) throw new Error('Serial port is not open')
    const payload = command.endsWith('\n') ? command : `${command}\n`
    await this.writer.write(textEncoder.encode(payload))
  }

  async query(command: string, timeoutMs = 3000): Promise<string> {
    this.readBuffer = ''
    await this.write(command)
    return this.readLine(timeoutMs)
  }

  private async readLine(timeoutMs: number): Promise<string> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const newlineIndex = this.readBuffer.search(/\r?\n/)
      if (newlineIndex >= 0) {
        const line = this.readBuffer.slice(0, newlineIndex).trim()
        this.readBuffer = this.readBuffer.slice(newlineIndex + 1).replace(/^\n/, '')
        return line
      }

      if (!this.reader) throw new Error('Serial port is not open')
      const { value, done } = await Promise.race([
        this.reader.read(),
        new Promise<{ value: undefined; done: true }>((resolve) =>
          setTimeout(() => resolve({ value: undefined, done: true }), 100),
        ),
      ])

      if (value) {
        this.readBuffer += textDecoder.decode(value, { stream: true })
      }
      if (done && !this.readBuffer) {
        throw new Error('Serial port closed while reading')
      }
    }
    throw new Error(`Timed out waiting for serial response (${timeoutMs} ms)`)
  }
}
