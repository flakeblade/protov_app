const PREFIX = '[ProtoV Serial]'

export function serialDebug(message: string, detail?: unknown): void {
  if (!import.meta.env.DEV) return
  if (detail === undefined) {
    console.debug(PREFIX, message)
    return
  }
  console.debug(PREFIX, message, detail)
}

export function serialWarn(message: string, detail?: unknown): void {
  if (!import.meta.env.DEV) return
  if (detail === undefined) {
    console.warn(PREFIX, message)
    return
  }
  console.warn(PREFIX, message, detail)
}

export function serialDebugTransportContext(): Record<string, string> {
  const devTransport =
    import.meta.env.VITE_PROTOV_DEV_TRANSPORT === 'webserial' ||
    import.meta.env.MODE === 'webserial'
      ? 'webserial'
      : 'mock'
  return {
    mode: import.meta.env.MODE,
    devTransport,
  }
}
