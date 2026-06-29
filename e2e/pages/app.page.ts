import type { Page } from '@playwright/test'

import { routes } from '../support/constants'
import type { ColorScheme } from '../support/theme'

/** Top-level navbar actions shared across Home, Lab, and Docs. */
export class AppPage {
  constructor(private readonly page: Page) {}

  themeToggle() {
    return this.page.getByRole('banner').getByRole('button', { name: 'Toggle color scheme' })
  }

  async expectColorScheme(scheme: ColorScheme) {
    await this.page.locator('html').waitFor({ state: 'attached' })
    await this.page.waitForFunction(
      (expected) => document.documentElement.getAttribute('data-mantine-color-scheme') === expected,
      scheme,
    )
  }

  async toggleColorScheme() {
    await this.themeToggle().click()
  }

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
