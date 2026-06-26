import type { SerialTransport } from './types'

/** Serialize async transport operations so concurrent polls do not interleave. */
export function createTransportQueue() {
  let chain: Promise<void> = Promise.resolve()

  return async <T>(operation: () => Promise<T>): Promise<T> => {
    const next = chain.then(operation, operation)
    chain = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }
}

export type TransportQueue = ReturnType<typeof createTransportQueue>

export function withTransportQueue(transport: SerialTransport, queue: TransportQueue): SerialTransport {
  return {
    label: transport.label,
    open: (baudRate?: number) => queue(() => transport.open(baudRate)),
    close: () => queue(() => transport.close()),
    write: (command: string) => queue(() => transport.write(command)),
    query: (command: string, timeoutMs?: number) => queue(() => transport.query(command, timeoutMs)),
  }
}
