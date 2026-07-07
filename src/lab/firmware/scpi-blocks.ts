import { FWUP_SIGNATURE_LEN } from './constants'

const textEncoder = new TextEncoder()

/** IEEE 488.2 `#Nd<payload>` definite-length block. */
export function encodeDefiniteBlock(payload: Uint8Array): Uint8Array {
  const lenStr = String(payload.length)
  const header = `#${lenStr.length}${lenStr}`
  const headerBytes = textEncoder.encode(header)
  const out = new Uint8Array(headerBytes.length + payload.length)
  out.set(headerBytes, 0)
  out.set(payload, headerBytes.length)
  return out
}

/** `SYST:FWUP:DATA #N<payload>\n` as raw bytes (may contain binary payload). */
export function encodeFwupDataLine(payload: Uint8Array): Uint8Array {
  const prefix = textEncoder.encode('SYST:FWUP:DATA ')
  const block = encodeDefiniteBlock(payload)
  const out = new Uint8Array(prefix.length + block.length + 1)
  out.set(prefix, 0)
  out.set(block, prefix.length)
  out[out.length - 1] = 0x0a
  return out
}

/** `SYST:FWUP:APPL #H<128 hex chars>\n` */
export function encodeFwupApplCommand(signature: Uint8Array): string {
  if (signature.length !== FWUP_SIGNATURE_LEN) {
    throw new Error(`Signature must be ${FWUP_SIGNATURE_LEN} bytes, got ${signature.length}`)
  }
  const hex = Array.from(signature, (byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join('')
  return `SYST:FWUP:APPL #H${hex}`
}
