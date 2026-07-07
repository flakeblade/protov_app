import type { ConnectionLostHandler, SerialTransport } from './types'
import { formatScpiCommand, takeScpiLine } from './scpi-lines'

const DEFAULT_BRIDGE_URL = 'ws://127.0.0.1:8765'

export function getMockBridgeUrl(): string {
  return import.meta.env.VITE_PROTOV_MOCK_WS ?? DEFAULT_BRIDGE_URL
}

interface LineWaiter {
  resolve: (line: string) => void
  reject: (reason: Error) => void
  timer: number
}

function waitForWebSocket(url: string, timeoutMs: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url)
    const timer = window.setTimeout(() => {
      socket.close()
      reject(new Error('Mock device bridge connection timed out'))
    }, timeoutMs)

    socket.addEventListener('open', () => {
      window.clearTimeout(timer)
      resolve(socket)
    })
    socket.addEventListener('error', () => {
      window.clearTimeout(timer)
      reject(new Error('Mock device bridge unavailable — start protov-hal-mock (just run-mock)'))
    })
  })
}

export class WebBridgeTransport implements SerialTransport {
  readonly label = 'ProtoV Mock (bridge)'
  private socket: WebSocket
  private intentionalClose = false
  private connectionLostHandlers = new Set<ConnectionLostHandler>()
  private lineWaiters: LineWaiter[] = []
  private pendingLines: string[] = []
  private lineBuffer = ''

  private constructor(socket: WebSocket) {
    this.socket = socket
    this.socket.binaryType = 'arraybuffer'
    this.socket.addEventListener('message', (event) => {
      if (typeof event.data === 'string') {
        this.lineBuffer += event.data
      } else if (event.data instanceof ArrayBuffer) {
        this.lineBuffer += new TextDecoder('latin1').decode(event.data)
      } else if (event.data instanceof Blob) {
        void event.data.arrayBuffer().then((buffer) => {
          this.lineBuffer += new TextDecoder('latin1').decode(buffer)
          this.flushLines()
        })
        return
      }
      this.flushLines()
    })
    this.socket.addEventListener('close', () => {
      this.rejectAllWaiters(new Error('Mock device bridge disconnected'))
      if (!this.intentionalClose) {
        for (const handler of this.connectionLostHandlers) {
          handler()
        }
      }
    })
  }

  onConnectionLost(handler: ConnectionLostHandler): () => void {
    this.connectionLostHandlers.add(handler)
    return () => {
      this.connectionLostHandlers.delete(handler)
    }
  }

  static async connect(url = getMockBridgeUrl()): Promise<WebBridgeTransport> {
    const socket = await waitForWebSocket(url, 2000)
    return new WebBridgeTransport(socket)
  }

  async open(): Promise<void> {}

  async close(): Promise<void> {
    this.intentionalClose = true
    this.socket.close()
  }

  async write(command: string): Promise<void> {
    this.socket.send(formatScpiCommand(command))
  }

  async writeBytes(data: Uint8Array): Promise<void> {
    this.socket.send(data.slice())
  }

  async query(command: string, timeoutMs = 3000): Promise<string> {
    await this.write(command)
    return this.readLine(timeoutMs)
  }

  async readLine(timeoutMs = 3000): Promise<string> {
    const buffered = this.takeBufferedLine()
    if (buffered !== null) {
      return buffered
    }

    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        const index = this.lineWaiters.findIndex((waiter) => waiter.resolve === resolve)
        if (index >= 0) this.lineWaiters.splice(index, 1)
        reject(new Error(`Timed out waiting for serial response (${timeoutMs} ms)`))
      }, timeoutMs)

      this.lineWaiters.push({ resolve, reject, timer })
      this.flushLines()
    })
  }

  async drainIncoming(timeoutMs: number): Promise<string[]> {
    const lines = [...this.pendingLines]
    this.pendingLines = []

    while (true) {
      const { line, rest } = takeScpiLine(this.lineBuffer)
      if (line === null) break
      this.lineBuffer = rest
      if (line.length > 0) lines.push(line)
    }

    if (lines.length > 0 || timeoutMs <= 0) {
      return lines
    }

    try {
      const line = await this.readLine(timeoutMs)
      if (line) lines.push(line)
    } catch {
      // drain timeout is expected
    }
    return lines
  }

  private takeBufferedLine(): string | null {
    if (this.pendingLines.length > 0) {
      return this.pendingLines.shift() ?? null
    }

    while (true) {
      const { line, rest } = takeScpiLine(this.lineBuffer)
      if (line === null) return null
      this.lineBuffer = rest
      if (line.length > 0) return line
    }
  }

  private flushLines() {
    while (true) {
      const { line, rest } = takeScpiLine(this.lineBuffer)
      if (line === null) break
      this.lineBuffer = rest
      if (line.length === 0) continue

      const waiter = this.lineWaiters.shift()
      if (!waiter) {
        this.pendingLines.push(line)
        continue
      }

      window.clearTimeout(waiter.timer)
      waiter.resolve(line)
    }
  }

  private rejectAllWaiters(error: Error): void {
    for (const waiter of this.lineWaiters) {
      window.clearTimeout(waiter.timer)
      waiter.reject(error)
    }
    this.lineWaiters = []
  }
}
