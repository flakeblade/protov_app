import type { ConnectionLostHandler, SerialTransport } from './types'
import { formatScpiCommand, takeScpiLine } from './scpi-lines'

const DEFAULT_BRIDGE_URL = 'ws://127.0.0.1:8765'

export function getMockBridgeUrl(): string {
  return import.meta.env.VITE_PROTOV_MOCK_WS ?? DEFAULT_BRIDGE_URL
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
      reject(new Error('Mock device bridge unavailable — run npm run dev:mock'))
    })
  })
}

export class WebBridgeTransport implements SerialTransport {
  readonly label = 'ProtoV Mock (bridge)'
  private socket: WebSocket
  private intentionalClose = false
  private connectionLostHandlers = new Set<ConnectionLostHandler>()
  private pending = new Map<
    string,
    { resolve: (value: string) => void; reject: (reason: Error) => void; timer: number }
  >()
  private lineBuffer = ''

  private constructor(socket: WebSocket) {
    this.socket = socket
    this.socket.addEventListener('message', (event) => {
      this.lineBuffer += String(event.data)
      this.flushLines()
    })
    this.socket.addEventListener('close', () => {
      for (const [, pending] of this.pending) {
        window.clearTimeout(pending.timer)
        pending.reject(new Error('Mock device bridge disconnected'))
      }
      this.pending.clear()
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

  async query(command: string, timeoutMs = 3000): Promise<string> {
    const key = command.trim()
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(key)
        reject(new Error(`Timed out waiting for ${key}`))
      }, timeoutMs)

      this.pending.set(key, { resolve, reject, timer })
      void this.write(command)
    })
  }

  private flushLines() {
    while (true) {
      const { line, rest } = takeScpiLine(this.lineBuffer)
      if (line === null) break
      this.lineBuffer = rest

      const [firstKey] = this.pending.keys()
      if (!firstKey) continue
      const pending = this.pending.get(firstKey)
      if (!pending) continue
      window.clearTimeout(pending.timer)
      this.pending.delete(firstKey)
      pending.resolve(line)
    }
  }
}
