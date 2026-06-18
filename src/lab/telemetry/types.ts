export interface DeviceTemperatures {
  /** Channel A NTC — ADC pin 26 */
  chA: number
  /** Channel B NTC — ADC pin 27 */
  chB: number
  /** RP2040 internal sensor */
  mcu: number
}

export interface DeviceInputPower {
  type: 'pd' | 'standard'
  voltage: number
  current: number
}

export interface DeviceHealth {
  senseOk: boolean
  converterOk: boolean
}

export interface TelemetryDevice {
  id: string
  name: string
  port: string
  baudRate: number
  firmwareVersion: string
  hardwareVersion: string
  serialNumber: string
  temperatures: DeviceTemperatures
  input: DeviceInputPower
  health: DeviceHealth
}

export const MOCK_TELEMETRY_DEVICES: TelemetryDevice[] = [
  {
    id: 'dev-a',
    name: 'ProtoV MINI',
    port: '/dev/ttyACM0',
    baudRate: 115200,
    firmwareVersion: '0.1.0',
    hardwareVersion: 'A.1',
    serialNumber: '550e8400',
    temperatures: { chA: 32.1, chB: 31.8, mcu: 38.4 },
    input: { type: 'pd', voltage: 20.0, current: 5.0 },
    health: { senseOk: true, converterOk: true },
  },
  {
    id: 'dev-b',
    name: 'ProtoV MINI',
    port: 'COM10',
    baudRate: 115200,
    firmwareVersion: '0.1.1',
    hardwareVersion: 'B.2',
    serialNumber: '32983fe4',
    temperatures: { chA: 41.2, chB: 39.6, mcu: 44.8 },
    input: { type: 'pd', voltage: 20.0, current: 3.0 },
    health: { senseOk: true, converterOk: true },
  },
]

/** @deprecated Use MOCK_TELEMETRY_DEVICES */
export const MOCK_TELEMETRY_DEVICE = MOCK_TELEMETRY_DEVICES[0]
