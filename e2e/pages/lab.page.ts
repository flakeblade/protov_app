import type { Page } from '@playwright/test'

import { routes } from '../support/constants'

export class LabPage {
  constructor(private readonly page: Page) {}

  private sidebar() {
    return this.page.locator('nav').filter({ has: this.page.getByRole('link', { name: 'Devices' }) })
  }

  async gotoDevices() {
    await this.page.goto(routes.lab.devices)
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
}
