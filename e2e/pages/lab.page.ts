import { expect, type Locator, type Page } from '@playwright/test'

import {
  CHANNEL_COLOR_RGB,
  type ChannelId,
  type MantineChannelColor,
} from '../support/mock-profiles'
import { routes } from '../support/constants'

export interface ChannelExpectation {
  id: ChannelId
  active: boolean
  voltage: string
  current: string
  color: MantineChannelColor
}

export interface DeviceCardExpectation {
  serial: string
  fw: string
  hw: string
  channels: ChannelExpectation[]
}

export class LabPage {
  constructor(private readonly page: Page) {}

  private sidebar() {
    return this.page.locator('nav').filter({ has: this.page.getByRole('link', { name: 'Devices' }) })
  }

  async gotoDevices() {
    await this.page.goto(routes.lab.devices)
  }

  async gotoControls() {
    await this.page.goto(routes.lab.controls)
  }

  async gotoGraphs() {
    await this.page.goto(routes.lab.graphs)
  }

  async gotoTelemetry() {
    await this.page.goto(routes.lab.telemetry)
  }

  async openDevices() {
    await this.sidebar().getByRole('link', { name: 'Devices' }).click()
    await this.expectDevices()
  }

  async openControls() {
    await this.sidebar().getByRole('link', { name: 'Controls' }).click()
    await this.expectControls()
  }

  async openGraphs() {
    await this.sidebar().getByRole('link', { name: 'Graphs' }).click()
    await this.expectGraphs()
  }

  async openTelemetry() {
    await this.sidebar().getByRole('link', { name: 'Telemetry' }).click()
    await this.expectTelemetry()
  }

  async setEngineeringView() {
    const engineering = this.sidebar().getByText('Engineering', { exact: true })
    await engineering.scrollIntoViewIfNeeded()
    await engineering.click()
  }

  async expectDevices() {
    await this.page.waitForURL(new RegExp(`${routes.lab.devices}$`))
  }

  async expectControls() {
    await this.page.waitForURL(new RegExp(`${routes.lab.controls}$`))
  }

  async expectGraphs() {
    await this.page.waitForURL(new RegExp(`${routes.lab.graphs}$`))
  }

  async expectTelemetry() {
    await this.page.waitForURL(new RegExp(`${routes.lab.telemetry}$`))
  }

  async expectDevicesEmptyState() {
    await this.expectDevices()
    await expect(this.page.getByText('Connect a device')).toBeVisible()
    await expect(this.page.getByRole('button', { name: 'Connect' })).toBeVisible()
  }

  async expectControlsEmptyState() {
    await this.expectControls()
    await expect(this.page.getByText('No devices connected')).toBeVisible()
    await expect(this.page.getByText('adjust channel setpoints and outputs')).toBeVisible()
    await expect(this.page.getByRole('button', { name: 'Go to Devices' })).toBeVisible()
  }

  async expectGraphsEmptyState() {
    await this.expectGraphs()
    await expect(this.page.getByText('No devices connected')).toBeVisible()
    await expect(this.page.getByText('stream live voltage, current, and power')).toBeVisible()
    await expect(this.page.getByRole('button', { name: 'Go to Devices' })).toBeVisible()
  }

  async expectTelemetryEmptyState() {
    await this.expectTelemetry()
    await expect(this.page.getByText('No devices connected')).toBeVisible()
    await expect(this.page.getByText('view live telemetry, register dumps')).toBeVisible()
    await expect(this.page.getByRole('button', { name: 'Go to Devices' })).toBeVisible()
  }

  async expectSidebarLinkActive(name: 'Devices' | 'Controls' | 'Graphs' | 'Telemetry') {
    await expect(
      this.sidebar().getByRole('link', { name, exact: true }),
    ).toHaveAttribute('aria-current', 'page')
  }

  async clickGoToDevices() {
    await this.page.getByRole('button', { name: 'Go to Devices' }).click()
    await this.expectDevices()
  }

  private connectedDeviceCards() {
    return this.page.locator('[class*="cardShell"]').filter({
      has: this.page.getByRole('button', { name: 'Disconnect' }),
    })
  }

  deviceCardBySerial(serial: string) {
    return this.connectedDeviceCards().filter({ hasText: serial })
  }

  async clickConnect() {
    const connect = this.page.getByRole('button', { name: 'Connect', exact: true })
    await expect(connect).toBeEnabled()
    const before = await this.connectedDeviceCards().count()
    await connect.click()
    await expect(this.connectedDeviceCards()).toHaveCount(before + 1, { timeout: 15_000 })
  }

  async expectNotification(title: string, message?: string) {
    const notification = this.page.getByRole('alert').filter({ hasText: title })
    await expect(notification).toBeVisible({ timeout: 10_000 })
    if (message) {
      await expect(notification).toContainText(message)
    }
  }

  async forceBridgeConnectionLost(deviceIndex = 0) {
    await this.page.evaluate((index) => {
      const OPEN = 1
      const registry = (window as Window & { __protovBridgeSockets?: WebSocket[] })
        .__protovBridgeSockets
      if (!registry?.length) {
        throw new Error('No bridge WebSockets registered — is the init script active?')
      }
      const open = registry.filter((socket) => socket.readyState === OPEN)
      if (open.length === 0) {
        throw new Error('No open bridge WebSockets')
      }
      const target = open[index] ?? open[open.length - 1]!
      target.close()
    }, deviceIndex)
  }

  async expectDeviceCount(count: number) {
    await expect(this.connectedDeviceCards()).toHaveCount(count)
  }

  async expectConnectDisabled() {
    await expect(
      this.page.getByRole('button', { name: 'Maximum devices connected' }),
    ).toBeDisabled()
  }

  async disconnectAllDevices() {
    await this.gotoDevices()
    while ((await this.connectedDeviceCards().count()) > 0) {
      const card = this.connectedDeviceCards().first()
      await card.getByRole('button', { name: 'Disconnect' }).click()
      await expect(card).toBeHidden({ timeout: 10_000 })
    }
    await this.expectDevicesEmptyState()
  }

  async clickDisconnect(serial: string) {
    const card = this.deviceCardBySerial(serial)
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Disconnect' }).click()
    await expect(card).toBeHidden({ timeout: 10_000 })
  }

  async clickGoToControls(serial: string) {
    const card = this.deviceCardBySerial(serial)
    await card.getByRole('button', { name: 'Go to controls' }).click()
    await this.expectControls()
  }

  async toggleChannel(serial: string, channelId: ChannelId) {
    const card = this.deviceCardBySerial(serial)
    await card.getByRole('button', { name: `Channel ${channelId}`, exact: true }).click()
  }

  private channelChip(card: Locator, channelId: ChannelId) {
    return card.getByRole('button', { name: `Channel ${channelId}`, exact: true })
  }

  async expectChannelOutputActive(serial: string, channelId: ChannelId, active: boolean) {
    const chip = this.channelChip(this.deviceCardBySerial(serial), channelId)
    await expect(chip).toHaveAttribute('aria-pressed', active ? 'true' : 'false')
    await expect(chip.getByText(active ? 'Output on' : 'Output off')).toBeVisible()
  }

  async expectChannelState(
    serial: string,
    channelId: ChannelId,
    expectation: Omit<ChannelExpectation, 'id'>,
  ) {
    const chip = this.channelChip(this.deviceCardBySerial(serial), channelId)
    await expect(chip).toHaveAttribute('aria-pressed', expectation.active ? 'true' : 'false')
    await expect(chip.getByText(expectation.active ? 'Output on' : 'Output off')).toBeVisible()
    await expect(chip).toContainText(expectation.voltage)
    await expect(chip).toContainText(expectation.current)
    await this.expectChannelColor(chip, expectation.color, expectation.active)
  }

  async expectDeviceCard(expectation: DeviceCardExpectation) {
    const card = this.deviceCardBySerial(expectation.serial)
    await expect(card).toBeVisible()
    await expect(card.getByText('ProtoV MINI')).toBeVisible()
    await expect(card.getByText(`SN ${expectation.serial}`)).toBeVisible()
    await expect(card.getByText(`FW v${expectation.fw}`)).toBeVisible()
    await expect(card.getByText(`HW rev ${expectation.hw}`)).toBeVisible()

    const goToControls = card.getByRole('button', { name: 'Go to controls' })
    const disconnect = card.getByRole('button', { name: 'Disconnect' })
    await expect(goToControls).toBeVisible()
    await expect(goToControls).toBeEnabled()
    await expect(disconnect).toBeVisible()
    await expect(disconnect).toBeEnabled()

    for (const channel of expectation.channels) {
      await this.expectChannelState(expectation.serial, channel.id, channel)
    }
  }

  async expectDeviceCardOrder(serials: string[]) {
    const cards = this.connectedDeviceCards()
    await expect(cards).toHaveCount(serials.length)
    for (let index = 0; index < serials.length; index += 1) {
      await expect(cards.nth(index)).toContainText(serials[index]!)
    }
  }

  private async expectChannelColor(
    chip: Locator,
    color: MantineChannelColor,
    active: boolean,
  ) {
    const badge = chip.locator('[data-variant]').first()
    await expect(badge).toHaveAttribute('data-variant', active ? 'filled' : 'outline')

    const expectedRgb = CHANNEL_COLOR_RGB[color].replace(/\s/g, '')
    await expect
      .poll(async () => {
        return badge.evaluate((element, isActive) => {
          const style = getComputedStyle(element)
          const value = isActive ? style.backgroundColor : style.borderColor
          return value.replace(/\s/g, '')
        }, active)
      })
      .toBe(expectedRgb)
  }
}
