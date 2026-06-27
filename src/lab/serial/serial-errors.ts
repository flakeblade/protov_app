export function formatSerialOpenError(error: unknown): Error {
  if (error instanceof DOMException) {
    if (error.name === 'InvalidStateError') {
      return new Error(
        'This serial port is still open from a previous connection. Disconnect the device in the app, unplug and replug the USB cable, then retry.',
      )
    }

    const message = error.message.toLowerCase()
    if (message.includes('failed to open serial port')) {
      return new Error(
        'Could not open the serial port. On Linux, add your user to the dialout group ' +
          'and ensure ModemManager is not holding the device (common with USB CDC / Pico). ' +
          'Unplug and replug the device, then retry.',
      )
    }

    return new Error(error.message)
  }

  if (error instanceof Error) {
    return error
  }

  return new Error('Could not open the serial device.')
}
