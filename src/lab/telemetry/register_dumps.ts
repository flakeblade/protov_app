export function formatIna226Dump(channel: 'A' | 'B') {
  const addr = channel === 'A' ? '41' : '40'
  return [
    `INA226 @ 0x${addr} (I2C1)`,
    '00 CONFIG        4127',
    '01 SHUNT_V       0008',
    '02 BUS_V         28A0',
    '03 POWER         0064',
    '04 CURRENT       00A3',
    '05 CALIBRATION    1000',
    '06 ENABLE         0007',
    '07 ALERT_LIMIT    0000',
    'FE MANUF_ID       5449',
    'FF DIE_ID         2260',
  ].join('\n')
}

export function formatTps55289Dump(channel: 'A' | 'B') {
  const addr = channel === 'A' ? '75' : '74'
  return [
    `TPS55289 @ 0x${addr} (I2C0)`,
    '00 REF_LSB         C8',
    '01 REF_MSB         00',
    '02 IOUT_LIMIT      64',
    '03 VOUT_SR          0',
    '04 VOUT_FS          0',
    '05 CDC              0',
    '06 MODE            03',
    '07 STATUS          20',
  ].join('\n')
}

export function registerDumpCommand(chip: 'ina226' | 'tps55289', channel: 'A' | 'B') {
  return `${chip} dump ch${channel.toLowerCase()}`
}
