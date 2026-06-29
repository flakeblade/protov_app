import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect } from '@playwright/test'

import { MAX_MOCK_SLOTS } from './mock-profiles'

const STATES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../states',
)

export const MOCK_CTRL_WS =
  process.env.PROTOV_MOCK_CTRL_WS ?? 'ws://127.0.0.1:8766'

export const MOCK_SCPI_WS =
  process.env.PROTOV_MOCK_SCPI_WS ?? 'ws://127.0.0.1:8765'

const POOL_FULL_MARKER = 'All four mock device slots are in use'

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
  | { action: 'release_all' }

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

function tryAcquireScpiSlot(): Promise<boolean> {
  return new Promise((resolve) => {
    const ws = new WebSocket(MOCK_SCPI_WS)
    let settled = false
    let poolFull = false

    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(openTimer)
      clearTimeout(failTimer)
      ws.close()
      resolve(value)
    }

    ws.addEventListener('message', (event) => {
      if (String(event.data).includes(POOL_FULL_MARKER)) {
        poolFull = true
        finish(false)
      }
    })

    let openTimer: ReturnType<typeof setTimeout> | undefined
    ws.addEventListener('open', () => {
      openTimer = setTimeout(() => {
        if (!poolFull) finish(true)
      }, 30)
    })

    ws.addEventListener('error', () => finish(false))
    const failTimer = setTimeout(() => finish(false), 3_000)
  })
}

function assertOk(response: ControlResponse, context: string): void {
  if (!response.ok) {
    throw new Error(`${context} failed: ${response.error ?? 'unknown error'}`)
  }
}

export interface MockChannelSnapshot {
  voltage: number
  current: number
  ovp: number
  ocp: number
  output: boolean
  prot_latched?: boolean
  latched_mode?: string
  color?: [number, number, number]
  measured?: {
    voltage: number
    current: number
    power: number
  }
}

export class MockControlClient {
  async ping(): Promise<void> {
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

  async releaseAllSlots(): Promise<void> {
    const response = await controlRequest({ action: 'release_all' })
    assertOk(response, 'release_all')
    if (response.message !== 'released_all') {
      throw new Error(`Unexpected release_all response: ${response.message ?? '(empty)'}`)
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

  async waitForChannelOutput(
    slot: number,
    channel: 'CH1' | 'CH2',
    output: boolean,
    timeoutMs = 15_000,
  ): Promise<void> {
    await expect
      .poll(async () => {
        const snapshot = await this.channelSnapshot(slot, channel)
        return snapshot.output === output
      }, { timeout: timeoutMs })
      .toBe(true)
  }

  async waitForFreeSlots(count: number, timeoutMs = 20_000): Promise<void> {
    await expect
      .poll(async () => this.countFreeSlots(), { timeout: timeoutMs })
      .toBeGreaterThanOrEqual(count)
  }

  private async countFreeSlots(): Promise<number> {
    let free = 0
    for (let attempt = 0; attempt < MAX_MOCK_SLOTS; attempt += 1) {
      if (!(await tryAcquireScpiSlot())) break
      free += 1
    }
    return free
  }

  async status(slot: number): Promise<Record<string, unknown>> {
    const response = await controlRequest({ action: 'status', slot })
    assertOk(response, `status slot ${slot}`)
    if (!response.state) {
      throw new Error(`status slot ${slot} returned no state`)
    }
    return response.state
  }

  async channelSnapshot(
    slot: number,
    channel: 'CH1' | 'CH2',
  ): Promise<MockChannelSnapshot> {
    const state = await this.status(slot)
    const channels = state.channels as Record<string, MockChannelSnapshot> | undefined
    const snapshot = channels?.[channel]
    if (!snapshot) {
      throw new Error(`Missing ${channel} in mock slot ${slot} status`)
    }
    return snapshot
  }

  async displaySettings(slot: number): Promise<{ lcd: number; led: number }> {
    const state = await this.status(slot)
    return {
      lcd: Number(state.lcd_brightness ?? 128),
      led: Number(state.led_brightness ?? 255),
    }
  }
}

export const mockControl = new MockControlClient()
