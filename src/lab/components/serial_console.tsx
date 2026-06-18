import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Group, ScrollArea, Stack, Text, TextInput } from '@mantine/core'
import { IconSend } from '@tabler/icons-react'

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

export function useSerialConsole(port: string, baudRate: number) {
  const [command, setCommand] = useState('')
  const [lines, setLines] = useState<ConsoleLine[]>(() => [
    createLine('sys', `${port} @ ${baudRate} baud`),
    createLine('sys', 'Ready — commands will be sent when connected.'),
  ])

  const appendLine = useCallback((direction: ConsoleLineDirection, text: string) => {
    setLines((current) => [...current, createLine(direction, text)])
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = command.trim()
    if (!trimmed) return

    appendLine('tx', trimmed)
    setCommand('')
    appendLine('sys', 'Not connected — command queued for WebSerial bridge.')
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
            if (event.key === 'Enter') onSend()
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
          onClick={onSend}
        >
          Send
        </Button>
      </Group>
    </Stack>
  )
}
