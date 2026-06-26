import type { LabDevice } from './device_store'

/** Module-level registry so open transports survive React remounts and route changes. */
class DeviceSession {
  private devices = new Map<string, LabDevice>()

  list(): LabDevice[] {
    return Array.from(this.devices.values())
  }

  has(deviceId: string): boolean {
    return this.devices.has(deviceId)
  }

  upsert(device: LabDevice): void {
    this.devices.set(device.id, device)
  }

  remove(deviceId: string): void {
    this.devices.delete(deviceId)
  }

  replaceAll(devices: LabDevice[]): void {
    this.devices.clear()
    for (const device of devices) {
      this.devices.set(device.id, device)
    }
  }
}

export const deviceSession = new DeviceSession()
