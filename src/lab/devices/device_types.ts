import type { Channel } from '../components/channel_chip'
import type { SerialTransport } from '../serial/types'
import type { DeviceTelemetry } from './telemetry_io'

export interface LabDevice {
  id: string
  name: string
  port: string
  description: string
  serialNumber: string
  fwVersion: string
  hwVersion: string
  channels: Channel[]
  telemetry: DeviceTelemetry
  colorSlot: number
  transport: SerialTransport
}
