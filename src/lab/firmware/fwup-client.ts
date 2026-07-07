import type { SerialTransport } from '../serial/types'
import { parseIdn } from '../serial/constants'
import { encodeFwupApplCommand, encodeFwupDataLine } from './scpi-blocks'
import {
  FWUP_DEFAULT_CHUNK_SIZE,
  FWUP_FLUSH_TIMEOUT_MS,
  FWUP_IO_TIMEOUT_MS,
  FWUP_SIGNATURE_LEN,
  FWUP_STAR_TIMEOUT_MS,
} from './constants'

export type FwupPhase = 'idle' | 'prepare' | 'transfer' | 'verify' | 'complete' | 'error'

export interface FwupProgress {
  phase: FwupPhase
  message: string
  bytesSent: number
  bytesTotal: number
  percent: number
}

export class FwupError extends Error {
  details?: { systErr?: string; fwupStat?: string }

  constructor(message: string, details?: { systErr?: string; fwupStat?: string }) {
    super(message)
    this.name = 'FwupError'
    this.details = details
  }
}

export interface UploadFirmwareOptions {
  chunkSize?: number
  onProgress?: (progress: FwupProgress) => void
  signal?: AbortSignal
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FwupError('Firmware update cancelled')
  }
}

function parseStatProgress(stat: string, total: number): FwupProgress | null {
  if (stat === 'IDLE') {
    return { phase: 'idle', message: 'Idle', bytesSent: 0, bytesTotal: total, percent: 0 }
  }
  if (stat.startsWith('PREPARE,')) {
    return {
      phase: 'prepare',
      message: 'Preparing device for OTA…',
      bytesSent: 0,
      bytesTotal: total,
      percent: 5,
    }
  }
  if (stat.startsWith('RECV,')) {
    const payload = stat.slice('RECV,'.length)
    const [receivedRaw, totalRaw] = payload.split('/')
    const received = Number.parseInt(receivedRaw ?? '0', 10)
    const recvTotal = Number.parseInt(totalRaw ?? String(total), 10) || total
    const percent = recvTotal > 0 ? Math.round((received / recvTotal) * 85) + 5 : 5
    return {
      phase: 'transfer',
      message: `Transferring firmware (${received}/${recvTotal} bytes)…`,
      bytesSent: received,
      bytesTotal: recvTotal,
      percent: Math.min(percent, 90),
    }
  }
  if (stat.startsWith('READY,')) {
    return {
      phase: 'verify',
      message: 'Verifying firmware image…',
      bytesSent: total,
      bytesTotal: total,
      percent: 92,
    }
  }
  if (stat === 'ERROR') {
    return {
      phase: 'error',
      message: 'Device reported an update error',
      bytesSent: 0,
      bytesTotal: total,
      percent: 0,
    }
  }
  return null
}

async function drainIncoming(transport: SerialTransport, timeoutMs: number): Promise<string[]> {
  if (transport.drainIncoming) {
    return transport.drainIncoming(timeoutMs)
  }
  return []
}

/** Clear stale bus lines and drain the SCPI error queue before starting FWUP. */
export async function flushScpiPort(transport: SerialTransport): Promise<void> {
  await drainIncoming(transport, FWUP_FLUSH_TIMEOUT_MS)

  const deadline = Date.now() + FWUP_FLUSH_TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      const err = await transport.query('SYST:ERR?', 400)
      if (err.startsWith('0,') || /"No error"/i.test(err)) {
        return
      }
    } catch {
      return
    }
  }
}

async function queryDiagnostics(transport: SerialTransport): Promise<{ systErr?: string; fwupStat?: string }> {
  const details: { systErr?: string; fwupStat?: string } = {}
  try {
    details.systErr = await transport.query('SYST:ERR?', 2000)
  } catch {
    // ignore
  }
  try {
    details.fwupStat = await transport.query('SYST:FWUP:STAT?', 2000)
  } catch {
    // ignore
  }
  return details
}

async function queryExpectOk(
  transport: SerialTransport,
  command: string,
  timeoutMs: number,
): Promise<string> {
  const response = (await transport.query(command, timeoutMs)).trim()
  if (response !== 'OK' && response !== '') {
    const details = await queryDiagnostics(transport)
    throw new FwupError(`${command} failed: ${response}`, details)
  }
  return response
}

async function readResponseLine(transport: SerialTransport, timeoutMs: number): Promise<string> {
  if (transport.readLine) {
    return (await transport.readLine(timeoutMs)).trim()
  }
  throw new FwupError('Transport does not support reading FWUP responses')
}

async function writeDataBlockAndReadOk(
  transport: SerialTransport,
  payload: Uint8Array,
): Promise<void> {
  const line = encodeFwupDataLine(payload)
  if (transport.writeBytes) {
    await transport.writeBytes(line)
  } else {
    throw new FwupError('Transport does not support binary SCPI writes required for FWUP DATA')
  }
  const response = await readResponseLine(transport, FWUP_IO_TIMEOUT_MS)
  if (response !== 'OK') {
    const details = await queryDiagnostics(transport)
    throw new FwupError(`FWUP DATA block failed: ${response}`, details)
  }
}

async function waitReceiving(
  transport: SerialTransport,
  total: number,
  onProgress: ((progress: FwupProgress) => void) | undefined,
  signal: AbortSignal | undefined,
): Promise<void> {
  const deadline = Date.now() + FWUP_STAR_TIMEOUT_MS
  while (Date.now() < deadline) {
    throwIfAborted(signal)
    const stat = (await transport.query('SYST:FWUP:STAT?', FWUP_IO_TIMEOUT_MS)).trim()
    const progress = parseStatProgress(stat, total)
    if (progress) onProgress?.(progress)
    if (stat.startsWith('RECV,') || stat.startsWith('READY,')) return
    if (stat === 'ERROR') {
      const details = await queryDiagnostics(transport)
      throw new FwupError('Device entered ERROR state during prepare', details)
    }
    await sleep(stat.startsWith('PREPARE,') ? 200 : 100)
  }
  throw new FwupError('Timed out waiting for device to enter receive mode')
}

export async function queryHardwareRevision(transport: SerialTransport): Promise<string> {
  try {
    const idat = (await transport.query('SYST:IDAT?', 3000)).trim()
    const hwFromIdat = idat.split(',')[1]?.trim()
    if (hwFromIdat) return hwFromIdat
  } catch {
    // fall back to IDN
  }

  const idnRaw = await transport.query('*IDN?', 3000)
  const idn = parseIdn(idnRaw)
  if (!idn?.hwVersion) {
    throw new FwupError('Could not determine hardware revision from *IDN? or SYST:IDAT?')
  }
  return idn.hwVersion
}

export async function uploadFirmware(
  transport: SerialTransport,
  firmware: Uint8Array,
  signature: Uint8Array,
  options: UploadFirmwareOptions = {},
): Promise<void> {
  if (signature.length !== FWUP_SIGNATURE_LEN) {
    throw new FwupError(`Signature must be ${FWUP_SIGNATURE_LEN} bytes`)
  }

  const chunkSize = Math.min(
    Math.max(options.chunkSize ?? FWUP_DEFAULT_CHUNK_SIZE, 1),
    FWUP_DEFAULT_CHUNK_SIZE,
  )
  const onProgress = options.onProgress
  const signal = options.signal
  const total = firmware.length

  throwIfAborted(signal)

  await flushScpiPort(transport)
  throwIfAborted(signal)

  onProgress?.({
    phase: 'prepare',
    message: 'Starting firmware update session…',
    bytesSent: 0,
    bytesTotal: total,
    percent: 2,
  })

  await queryExpectOk(transport, `SYST:FWUP:STAR ${total}`, FWUP_STAR_TIMEOUT_MS)
  await waitReceiving(transport, total, onProgress, signal)

  let offset = 0
  while (offset < firmware.length) {
    throwIfAborted(signal)
    const end = Math.min(offset + chunkSize, firmware.length)
    const chunk = firmware.subarray(offset, end)
    await writeDataBlockAndReadOk(transport, chunk)
    offset = end
    onProgress?.({
      phase: 'transfer',
      message: `Transferring firmware (${offset}/${total} bytes)…`,
      bytesSent: offset,
      bytesTotal: total,
      percent: Math.min(90, Math.round((offset / total) * 85) + 5),
    })
  }

  const stat = (await transport.query('SYST:FWUP:STAT?', FWUP_IO_TIMEOUT_MS)).trim()
  if (!stat.startsWith('READY,')) {
    const details = await queryDiagnostics(transport)
    throw new FwupError(`Expected READY state before APPL, got ${stat}`, details)
  }

  onProgress?.({
    phase: 'verify',
    message: 'Applying signed firmware image…',
    bytesSent: total,
    bytesTotal: total,
    percent: 95,
  })

  await queryExpectOk(transport, encodeFwupApplCommand(signature), FWUP_STAR_TIMEOUT_MS)

  onProgress?.({
    phase: 'complete',
    message: 'Update complete',
    bytesSent: total,
    bytesTotal: total,
    percent: 100,
  })
}

export async function abortFirmwareUpdate(transport: SerialTransport): Promise<void> {
  try {
    await queryExpectOk(transport, 'SYST:FWUP:ABOR', FWUP_IO_TIMEOUT_MS)
  } catch {
    // best effort
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
