/** ProtoV SCPI uses LF-only line endings (no CR). */
export const SCPI_LINE_FEED = '\n'

export function formatScpiCommand(command: string): string {
  const body = command.replace(/\r/g, '').trim()
  return `${body}${SCPI_LINE_FEED}`
}

export function takeScpiLine(buffer: string): { line: string | null; rest: string } {
  const index = buffer.indexOf(SCPI_LINE_FEED)
  if (index < 0) {
    return { line: null, rest: buffer }
  }

  const line = buffer.slice(0, index).replace(/\r/g, '').trim()
  return { line, rest: buffer.slice(index + 1) }
}
