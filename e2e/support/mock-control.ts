import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { MAX_MOCK_SLOTS } from './mock-profiles'

const STATES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../states',
)

export const MOCK_CTRL_WS =
  process.env.PROTOV_MOCK_CTRL_WS ?? 'ws://127.0.0.1:8766'

export const MOCK_SCPI_WS =
  process.env.PROTOV_MOCK_SCPI_WS ?? 'ws://127.0.0.1:8765'

interface ControlResponse {
  ok: boolean
  message?: string
  error?: string
  slot?: number
  state?: Record<string, unknown>
}

type ControlAction =
  | { action: 'ping' }
  | { action: 'status'; slot?: number }
  | { action: 'reset'; slot?: number }
  | { action: 'load'; slot?: number; state: Record<string, unknown> }

async function controlRequest(payload: ControlAction): Promise<ControlResponse> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(MOCK_CTRL_WS)
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error(`Control socket timeout: ${MOCK_CTRL_WS}`))
    }, 5_000)

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify(payload))
    })

    ws.addEventListener('message', (event) => {
      clearTimeout(timeout)
      try {
        resolve(JSON.parse(String(event.data)) as ControlResponse)
      } catch (error) {
        reject(error)
      } finally {
        ws.close()
      }
    })

    ws.addEventListener('error', () => {
      clearTimeout(timeout)
      reject(
        new Error(
          `Control socket unreachable at ${MOCK_CTRL_WS}. ` +
            'Start the Rust mock: cd /home/tianyi/src/protov && just run-mock',
        ),
      )
    })
  })
}

async function scpiHealthCheck(): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(MOCK_SCPI_WS)
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error(`SCPI bridge timeout: ${MOCK_SCPI_WS}`))
    }, 5_000)

    ws.addEventListener('open', () => {
      clearTimeout(timeout)
      ws.close()
      resolve()
    })

    ws.addEventListener('error', () => {
      clearTimeout(timeout)
      reject(
        new Error(
          `SCPI bridge unreachable at ${MOCK_SCPI_WS}. ` +
            'Start the Rust mock: cd /home/tianyi/src/protov && just run-mock',
        ),
      )
    })
  })
}

function assertOk(response: ControlResponse, context: string): void {
  if (!response.ok) {
    throw new Error(`${context} failed: ${response.error ?? 'unknown error'}`)
  }
}

export class MockControlClient {
  async ping(): Promise<void> {
    await scpiHealthCheck()
    const response = await controlRequest({ action: 'ping' })
    assertOk(response, 'ping')
    if (response.message !== 'pong') {
      throw new Error(`Unexpected ping response: ${response.message ?? '(empty)'}`)
    }
  }

  async resetSlot(slot: number): Promise<void> {
    const response = await controlRequest({ action: 'reset', slot })
    assertOk(response, `reset slot ${slot}`)
  }

  async resetAllSlots(): Promise<void> {
    for (let slot = 0; slot < MAX_MOCK_SLOTS; slot += 1) {
      await this.resetSlot(slot)
    }
  }

  async loadState(slot: number, state: Record<string, unknown>): Promise<void> {
    const response = await controlRequest({ action: 'load', slot, state })
    assertOk(response, `load slot ${slot}`)
  }

  async loadStateFile(slot: number, filename: string): Promise<void> {
    const filePath = path.join(STATES_DIR, filename)
    const raw = fs.readFileSync(filePath, 'utf8')
    const state = JSON.parse(raw) as Record<string, unknown>
    await this.loadState(slot, state)
  }

  async status(slot: number): Promise<Record<string, unknown>> {
    const response = await controlRequest({ action: 'status', slot })
    assertOk(response, `status slot ${slot}`)
    if (!response.state) {
      throw new Error(`status slot ${slot} returned no state`)
    }
    return response.state
  }
}

export const mockControl = new MockControlClient()
