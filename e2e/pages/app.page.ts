import type { Page } from '@playwright/test'

import { routes } from '../support/constants'

/** Top-level navbar actions shared across Home, Lab, and Docs. */
export class AppPage {
  constructor(private readonly page: Page) {}

  async gotoHome() {
    await this.page.goto(routes.home)
  }

  async gotoLab() {
    await this.page.goto(routes.lab.devices)
  }

  async gotoDocs() {
    await this.page.goto(routes.docs.root)
  }

  async clickNavLink(name: 'Home' | 'Lab' | 'Docs') {
    await this.page.getByRole('banner').getByRole('link', { name, exact: true }).click()
  }

  async expectHome() {
    await this.page.waitForURL((url) => url.pathname === routes.home || url.pathname === `${routes.home}/`)
  }

  async expectLab() {
    await this.page.waitForURL(/\/lab(\/|$)/)
  }

  async expectDocs() {
    await this.page.waitForURL(/\/docs(\/|$)/)
  }
}
