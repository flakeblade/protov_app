import { type ChildProcess, spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { test as base } from '@playwright/test'

const MOCK_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../mock-device',
)

export type MockDeviceHandle = {
  /** Client serial port path (WebSerial / pyvisa). */
  clientPort: string
  /** Unix control socket for LOAD / STATUS / RESET. */
  controlSocket: string
  /** Load a preset state file (YAML or JSON under mock-device/states/). */
  loadState: (stateFile: string) => Promise<string>
  /** Query JSON device status via control socket. */
  status: () => Promise<Record<string, unknown>>
}

async function controlCommand(socketPath: string, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(socketPath, () => {
      client.write(`${command}\n`)
    })
    let data = ''
    client.on('data', (chunk) => {
      data += chunk.toString()
    })
    client.on('end', () => resolve(data.trim()))
    client.on('error', reject)
  })
}

function waitForPath(filePath: string, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for path: ${filePath}`))
        return
      }
      if (fs.existsSync(filePath)) {
        resolve()
        return
      }
      setTimeout(poll, 50)
    }
    poll()
  })
}

function waitForPortFile(portFile: string, timeoutMs = 10_000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for port file: ${portFile}`))
        return
      }
      if (fs.existsSync(portFile)) {
        const port = fs.readFileSync(portFile, 'utf8').trim()
        if (port) {
          resolve(port)
          return
        }
      }
      setTimeout(poll, 50)
    }
    poll()
  })
}

type MockDeviceFixtures = {
  mockDevice: MockDeviceHandle
}

export const test = base.extend<MockDeviceFixtures>({
  mockDevice: async ({}, use, testInfo) => {
    // Each test gets its own port/control files so parallel workers do not collide.
    const runDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `protov-mock-w${testInfo.workerIndex}-`),
    )
    const portFile = path.join(runDir, 'port')
    const controlSocket = path.join(runDir, 'ctrl')
    const runScript = path.join(MOCK_ROOT, 'scripts/run.sh')

    let proc: ChildProcess | null = spawn(runScript, [], {
      cwd: MOCK_ROOT,
      env: {
        ...process.env,
        PROTOV_MOCK_PORT_FILE: portFile,
        PROTOV_MOCK_CTRL_SOCK: controlSocket,
        PROTOV_MOCK_STATE: path.join(MOCK_ROOT, 'states/default.yaml'),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    try {
      const clientPort = await waitForPortFile(portFile)
      await waitForPath(controlSocket)
      const ping = await controlCommand(controlSocket, 'PING')
      if (!ping.startsWith('OK')) {
        throw new Error(`Mock device control ping failed: ${ping}`)
      }

      const handle: MockDeviceHandle = {
        clientPort,
        controlSocket,
        loadState: async (stateFile: string) => {
          const resolved = path.isAbsolute(stateFile)
            ? stateFile
            : path.join(MOCK_ROOT, 'states', stateFile)
          return controlCommand(controlSocket, `LOAD ${resolved}`)
        },
        status: async () => {
          const raw = await controlCommand(controlSocket, 'STATUS')
          return JSON.parse(raw) as Record<string, unknown>
        },
      }

      await use(handle)
    } finally {
      proc?.kill('SIGTERM')
      proc = null
      fs.rmSync(runDir, { recursive: true, force: true })
    }
  },
})

export { expect } from '@playwright/test'
