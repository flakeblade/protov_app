import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Group, ScrollArea, Stack, Text, TextInput } from '@mantine/core'
import { IconSend } from '@tabler/icons-react'

import { linkDescription } from '../devices/telemetry_io'
import type { SerialTransport } from '../serial/types'
import classes from './serial_console.module.css'

export type ConsoleLineDirection = 'tx' | 'rx' | 'sys'

export interface ConsoleLine {
  id: string
  direction: ConsoleLineDirection
  text: string
  timestamp: Date
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function directionPrefix(direction: ConsoleLineDirection) {
  if (direction === 'tx') return '>'
  if (direction === 'rx') return '<'
  return '·'
}

function createLine(direction: ConsoleLineDirection, text: string): ConsoleLine {
  return {
    id: `${Date.now()}-${Math.random()}`,
    direction,
    text,
    timestamp: new Date(),
  }
}

interface UseSerialConsoleOptions {
  transport: SerialTransport | null
  port: string
  baudRate: number
}

export function useSerialConsole({ transport, port, baudRate }: UseSerialConsoleOptions) {
  const [command, setCommand] = useState('')
  const [lines, setLines] = useState<ConsoleLine[]>([])
  const transportRef = useRef(transport)
  transportRef.current = transport

  const appendLine = useCallback((direction: ConsoleLineDirection, text: string) => {
    setLines((current) => [...current, createLine(direction, text)])
  }, [])

  useEffect(() => {
    setLines([
      createLine('sys', linkDescription(port, baudRate)),
      createLine(
        'sys',
        transport
          ? 'Link open — enter SCPI commands or informal register dump commands.'
          : 'No transport — connect a device to send commands.',
      ),
    ])
  }, [transport, port, baudRate])

  const handleSend = useCallback(async () => {
    const trimmed = command.trim()
    if (!trimmed) return

    appendLine('tx', trimmed)
    setCommand('')

    const activeTransport = transportRef.current
    if (!activeTransport) {
      appendLine('sys', 'Not connected — connect a device on the Devices page.')
      return
    }

    try {
      const response = await activeTransport.query(trimmed)
      const display = response.includes('|') ? response.split('|').join('\n') : response.trim()
      if (display) {
        for (const line of display.split('\n')) {
          appendLine('rx', line)
        }
      } else {
        appendLine('sys', '(no response)')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Command failed'
      appendLine('sys', message)
    }
  }, [appendLine, command])

  return { lines, command, setCommand, appendLine, handleSend }
}

interface SerialConsolePanelProps {
  lines: ConsoleLine[]
  command: string
  setCommand: (value: string) => void
  onSend: () => void
  compact?: boolean
}

export function SerialConsolePanel({
  lines,
  command,
  setCommand,
  onSend,
  compact = false,
}: SerialConsolePanelProps) {
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight })
  }, [lines])

  return (
    <Stack gap={6}>
      <Text className={classes.sectionLabel} c="dimmed">
        SERIAL CONSOLE
      </Text>

      <ScrollArea
        className={compact ? classes.logCompact : classes.log}
        viewportRef={viewportRef}
      >
        <Stack gap={2}>
          {lines.map((line) => (
            <Text key={line.id} className={classes.line} component="div">
              <span className={classes.timestamp}>[{formatTime(line.timestamp)}]</span>{' '}
              <span className={`${classes.prefix} ${classes[line.direction]}`}>
                {directionPrefix(line.direction)}
              </span>{' '}
              <span>{line.text}</span>
            </Text>
          ))}
        </Stack>
      </ScrollArea>

      <Group gap={6} align="flex-end" wrap="nowrap">
        <TextInput
          className={classes.input}
          value={command}
          onChange={(event) => setCommand(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void onSend()
          }}
          placeholder="Command…"
          size="xs"
          styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
        />
        <Button
          size="xs"
          variant="light"
          color="gray"
          leftSection={<IconSend size={12} />}
          onClick={() => void onSend()}
        >
          Send
        </Button>
      </Group>
    </Stack>
  )
}
