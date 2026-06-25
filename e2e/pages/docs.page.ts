import type { Page } from '@playwright/test'

import { routes } from '../support/constants'

export class DocsPage {
  constructor(private readonly page: Page) {}

  async gotoOverview() {
    await this.page.goto(routes.docs.root)
  }

  private docItem(title: string) {
    return this.page.locator('[class*="NavLink-root"]').filter({
      has: this.page.locator('[class*="NavLink-label"]', { hasText: title }),
    })
  }

  async openGettingStarted() {
    await this.docItem('Getting Started').click()
    await this.expectGettingStarted()
  }

  async openHardware() {
    await this.docItem('Hardware').click()
    await this.expectHardware()
  }

  async expectOverview() {
    await this.page.waitForURL(/\/docs\/?$/)
  }

  async expectGettingStarted() {
    await this.page.waitForURL(new RegExp(`${routes.docs.gettingStarted}$`))
  }

  async expectHardware() {
    await this.page.waitForURL(new RegExp(`${routes.docs.hardware}$`))
  }
}
