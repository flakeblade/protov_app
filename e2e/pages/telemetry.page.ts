import { expect, type Locator, type Page } from '@playwright/test'

export class TelemetryPage {
  constructor(private readonly page: Page) {}

  deviceCards() {
    return this.page.locator('[class*="mantine-Card-root"]').filter({
      has: this.page.getByText('ProtoV MINI', { exact: true }),
    })
  }

  deviceCard(index = 0) {
    return this.deviceCards().nth(index)
  }

  deviceCardBySerial(serial: string) {
    return this.deviceCards().filter({ hasText: `SN ${serial}` })
  }

  async expectDeviceCardCount(count: number) {
    await expect(this.deviceCards()).toHaveCount(count)
  }

  async expectDeviceIdentity(
    card: Locator,
    options: {
      serial: string
      fw: string
      hw: string
      portFragment?: string
    },
  ) {
    await expect(card.getByText('ProtoV MINI', { exact: true })).toBeVisible()
    await expect(card.getByText(`SN ${options.serial}`)).toBeVisible()
    await expect(card.getByText(`FW v${options.fw}`)).toBeVisible()
    await expect(card.getByText(`HW ${options.hw}`)).toBeVisible()
    await expect(card.locator('code').filter({ hasText: '115200 baud' })).toBeVisible()
    if (options.portFragment) {
      await expect(card.locator('code').filter({ hasText: options.portFragment })).toBeVisible()
    }
  }

  async expectTemperature(card: Locator, label: 'Ch A' | 'Ch B' | 'MCU', celsius: string) {
    const meter = card.locator('[class*="meter"]').filter({ hasText: label })
    await expect(meter.getByText(new RegExp(`${celsius}\\s*°C`))).toBeVisible()
  }

  async expectInputPower(card: Locator, voltage: string, current: string, type: 'PD' | 'USB' = 'PD') {
    await expect(card.locator('code').filter({ hasText: new RegExp(`${type}\\s+${voltage}\\s+V`) })).toBeVisible()
    await expect(card.locator('code').filter({ hasText: new RegExp(`${current}\\s+A`) })).toBeVisible()
  }

  async expectHealthBadge(card: Locator, chip: 'INA226' | 'TPS55289', healthy: boolean) {
    const badge = card.locator('[class*="Badge-root"]').filter({ hasText: chip })
    await expect(badge).toBeVisible()
    await expect
      .poll(async () =>
        badge.evaluate((el, wantHealthy) => {
          const { backgroundColor } = getComputedStyle(el)
          const [r, g] = backgroundColor.match(/\d+/g)?.map(Number) ?? [0, 0]
          return wantHealthy ? g > r : r > g
        }, healthy),
      )
      .toBe(true)
  }

  lcdSlider(card: Locator) {
    return card.getByRole('slider').nth(0)
  }

  ledSlider(card: Locator) {
    return card.getByRole('slider').nth(1)
  }

  async expectBrightnessLabels(card: Locator, lcd: number, led: number) {
    await expect(card.getByText(`LCD brightness (${lcd})`)).toBeVisible()
    await expect(card.getByText(`LED brightness (${led})`)).toBeVisible()
  }

  async setLcdBrightness(card: Locator, value: number) {
    await this.setSliderValue(this.lcdSlider(card), value)
    await expect(card.getByText(`LCD brightness (${value})`)).toBeVisible({ timeout: 10_000 })
  }

  async setLedBrightness(card: Locator, value: number) {
    await this.setSliderValue(this.ledSlider(card), value)
    await expect(card.getByText(`LED brightness (${value})`)).toBeVisible({ timeout: 10_000 })
  }

  private async setSliderValue(slider: Locator, value: number, max = 255) {
    const clamped = Math.min(max, Math.max(0, value))
    await slider.focus()
    if (clamped > max / 2) {
      await this.page.keyboard.press('End')
      for (let step = 0; step < max - clamped; step += 1) {
        await this.page.keyboard.press('ArrowLeft')
      }
    } else {
      await this.page.keyboard.press('Home')
      for (let step = 0; step < clamped; step += 1) {
        await this.page.keyboard.press('ArrowRight')
      }
    }
    await this.page.keyboard.press('Tab')
  }

  registerDumpButton(card: Locator, chip: 'INA226' | 'TPS55289', channel: 'A' | 'B') {
    return card.getByRole('button', { name: `${chip} ${channel}`, exact: true })
  }

  async clickRegisterDump(card: Locator, chip: 'INA226' | 'TPS55289', channel: 'A' | 'B') {
    await this.registerDumpButton(card, chip, channel).click()
  }

  consoleInput(card: Locator) {
    return card.getByPlaceholder('Command…')
  }

  consoleSendButton(card: Locator) {
    return card.getByRole('button', { name: 'Send', exact: true })
  }

  async sendConsoleCommand(card: Locator, command: string) {
    await this.consoleInput(card).fill(command)
    await this.consoleSendButton(card).click()
  }

  consoleSection(card: Locator) {
    return card.locator('[class*="consoleSection"]')
  }

  async expectConsoleContains(card: Locator, text: string | RegExp) {
    await expect(this.consoleSection(card).getByText(text)).toBeVisible({ timeout: 10_000 })
  }

  async expectConsoleLinkOpen(card: Locator) {
    await this.expectConsoleContains(card, /Link open/)
  }
}
