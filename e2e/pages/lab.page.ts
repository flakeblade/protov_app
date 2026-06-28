import { expect, type Page } from '@playwright/test'

import { routes } from '../support/constants'

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
}
