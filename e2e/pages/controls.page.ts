import { expect, type Locator, type Page } from '@playwright/test'

import type { ChannelId } from '../support/mock-profiles'

export type ControlParameter = 'Voltage' | 'Current' | 'Power'
export type SetpointField = 'SET' | 'OVP' | 'OCP'

export class ControlsPage {
  constructor(private readonly page: Page) {}

  channelCards() {
    return this.page.locator('[class*="mantine-Card-root"]').filter({
      has: this.page.getByText(/^Channel [AB]$/, { exact: true }),
    })
  }

  channelCard(channelId: ChannelId, index = 0) {
    return this.channelCards()
      .filter({ has: this.page.getByText(`Channel ${channelId}`, { exact: true }) })
      .nth(index)
  }

  async expectChannelCardCount(count: number) {
    await expect(this.channelCards()).toHaveCount(count)
  }

  async expectReading(card: Locator, parameter: ControlParameter, value: string) {
    const row = card
      .locator('[class*="parameterRow"], [class*="powerRow"]')
      .filter({ hasText: parameter })
    await expect(row.locator('[class*="readingValue"]')).toContainText(value)
  }

  async expectChannelMode(card: Locator, mode: string, fault = false) {
    const tag = card.locator('[class*="modeTag"]')
    await expect(tag).toHaveText(mode)
    if (fault) {
      await expect(tag).toHaveClass(/modeTagFault/)
    }
  }

  outputSwitch(card: Locator, channelId: ChannelId) {
    return card.getByRole('switch', { name: `Toggle output for channel ${channelId}` })
  }

  applyButton(card: Locator) {
    return card.getByRole('button', { name: 'Apply' })
  }

  setpointInput(card: Locator, row: 'Voltage' | 'Current', field: SetpointField) {
    const rowLocator = card.locator('[class*="parameterRow"]').filter({ hasText: row })
    const fieldLocator = rowLocator
      .locator('[class*="limitField"]')
      .filter({ has: this.page.getByText(field, { exact: true }) })
    return fieldLocator.getByRole('textbox')
  }

  async fillSetpoint(
    card: Locator,
    row: 'Voltage' | 'Current',
    field: SetpointField,
    value: string,
  ) {
    const input = this.setpointInput(card, row, field)
    await input.fill(value)
  }

  async expectSetpointValue(
    card: Locator,
    row: 'Voltage' | 'Current',
    field: SetpointField,
    value: string,
  ) {
    const unit = row === 'Voltage' || field === 'OVP' ? 'V' : 'A'
    await expect(this.setpointInput(card, row, field)).toHaveValue(`${value}${unit}`)
  }

  async expectSetpointError(
    card: Locator,
    row: 'Voltage' | 'Current',
    field: SetpointField,
    outOfRange: boolean,
  ) {
    const input = this.setpointInput(card, row, field)
    if (outOfRange) {
      await expect(input).toHaveClass(/limitInputError/)
    } else {
      await expect(input).not.toHaveClass(/limitInputError/)
    }
  }

  async expectApplyEnabled(card: Locator, enabled: boolean) {
    const button = this.applyButton(card)
    if (enabled) {
      await expect(button).toBeEnabled()
    } else {
      await expect(button).toBeDisabled()
    }
  }

  async clickApply(card: Locator) {
    const button = this.applyButton(card)
    await expect(button).toBeEnabled()
    await button.click()
  }

  async toggleOutput(card: Locator, channelId: ChannelId) {
    await this.outputSwitch(card, channelId).click({ force: true })
  }

  async expectOutputOn(card: Locator, channelId: ChannelId, on: boolean) {
    const toggle = this.outputSwitch(card, channelId)
    if (on) {
      await expect(toggle).toBeChecked()
    } else {
      await expect(toggle).not.toBeChecked()
    }
  }

  colorPickerButton(card: Locator) {
    return card.getByRole('button', { name: 'Adjust channel color' })
  }

  async pickChannelColor(card: Locator, color: string) {
    await this.colorPickerButton(card).click()
    await this.page.getByLabel(color, { exact: true }).click()
  }

  async expectNotification(title: string, message?: string) {
    const notification = this.page.getByRole('alert').filter({ hasText: title })
    await expect(notification).toBeVisible({ timeout: 10_000 })
    if (message) {
      await expect(notification).toContainText(message)
    }
  }
}
