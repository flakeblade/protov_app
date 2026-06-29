import { usesMockTransport } from '../serial/request-port'
import { isWebSerialSupported } from '../serial/types'

export function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent
  const isAppleWebKit = /AppleWebKit/i.test(ua)
  const isChromiumFamily =
    /Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|Opera|SamsungBrowser/i.test(ua)

  return isAppleWebKit && !isChromiumFamily
}

/** Whether the Lab UI can run in this browser (hardware or dev mock). */
export function isLabSupported(): boolean {
  if (isSafari()) return false
  if (usesMockTransport()) return true
  return isWebSerialSupported()
}

export function labUnsupportedReason(): string {
  if (isSafari()) {
    return 'Safari is not supported for ProtoV Lab.'
  }
  return 'This browser does not support the Web Serial API required for ProtoV Lab.'
}
