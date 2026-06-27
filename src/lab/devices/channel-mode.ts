export const CHANNEL_HARDWARE_MODES = [
  'OFF',
  'CV',
  'CC',
  'SHORT',
  'TEMP',
  'OCP',
  'OVP',
] as const

export type ChannelHardwareMode = (typeof CHANNEL_HARDWARE_MODES)[number]

export const CHANNEL_FAULT_MODES = ['OCP', 'OVP', 'TEMP'] as const

export type ChannelFaultMode = (typeof CHANNEL_FAULT_MODES)[number]

const MODE_LOOKUP = new Set<string>(CHANNEL_HARDWARE_MODES)

export function isChannelHardwareMode(value: string): value is ChannelHardwareMode {
  return MODE_LOOKUP.has(value)
}

export function parseChannelMode(raw: string): ChannelHardwareMode {
  const mode = raw.trim().toUpperCase()
  if (!isChannelHardwareMode(mode)) {
    throw new Error(`Invalid channel mode response: ${raw}`)
  }
  return mode
}

export function isChannelFaultMode(mode: ChannelHardwareMode): mode is ChannelFaultMode {
  return mode === 'OCP' || mode === 'OVP' || mode === 'TEMP'
}

export const MODE_TOOLTIPS: Record<ChannelHardwareMode, string> = {
  OFF: 'Output disabled',
  CV: 'Constant voltage — output holds target voltage',
  CC: 'Constant current — output holds target current',
  SHORT: 'Short circuit detected',
  TEMP: 'Over-temperature protection tripped',
  OCP: 'Over-current protection tripped',
  OVP: 'Over-voltage protection tripped',
}

export const FAULT_NOTIFICATIONS: Record<
  ChannelFaultMode,
  { title: string; message: (deviceName: string, channelId: string) => string }
> = {
  OCP: {
    title: 'Over-current protection',
    message: (deviceName, channelId) =>
      `${deviceName} channel ${channelId} exceeded its current limit. Output disabled.`,
  },
  OVP: {
    title: 'Over-voltage protection',
    message: (deviceName, channelId) =>
      `${deviceName} channel ${channelId} exceeded its voltage limit. Output disabled.`,
  },
  TEMP: {
    title: 'Over-temperature protection',
    message: (deviceName, channelId) =>
      `${deviceName} channel ${channelId} shut down due to over-temperature.`,
  },
}
