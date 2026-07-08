import { expect, type Locator, type Page } from '@playwright/test'

type DismissMethod = 'escape' | 'close' | 'backdrop'
type StepKey = 'check' | 'download' | 'install' | 'reconnect' | 'confirm'

const STEP_LABELS: Record<StepKey, string> = {
  check: 'Check',
  download: 'Download',
  install: 'Install',
  reconnect: 'Reconnect',
  confirm: 'Confirm',
}

export class FirmwareUpdatePage {
  constructor(private readonly page: Page) {}

  shell(): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.locator('header').getByText('Firmware update', { exact: true }),
    })
  }

  modalTitle(): Locator {
    return this.shell().locator('header').getByText('Firmware update', { exact: true })
  }

  versionHero(): Locator {
    return this.shell().locator('[class*="versionHero"]')
  }

  footerStatus(): Locator {
    return this.shell().locator('[class*="footerStatus"]')
  }

  step(key: StepKey): Locator {
    return this.shell().locator(`[data-step="${key}"]`)
  }

  activeStep(key: StepKey): Locator {
    return this.shell().locator(`[data-step="${key}"][data-active="true"]`)
  }

  nestedDialog(title: string | RegExp): Locator {
    return this.page.getByRole('dialog').filter({ hasText: title }).last()
  }

  async expectOpen() {
    await expect(this.shell()).toBeVisible({ timeout: 15_000 })
    await expect(this.modalTitle()).toBeVisible()
  }

  async expectClosed() {
    await expect(this.shell()).toHaveCount(0, { timeout: 10_000 })
  }

  async waitForCheckOutcome(
    outcome: 'available' | 'up-to-date' | 'unsupported-fw' | 'incompatible' | 'error',
  ) {
    const texts: Record<typeof outcome, RegExp> = {
      available: /Update available for your hardware/,
      'up-to-date': /Device matches latest bundled release/,
      'unsupported-fw': /In-app updates require firmware v1\.6 or newer/,
      incompatible: /No signed firmware build for hardware revision/,
      error: /disconnected|not connected|failed|error/i,
    }
    await expect(this.shell().getByText(texts[outcome])).toBeVisible({ timeout: 20_000 })
  }

  async expectUpToDateBadge() {
    await expect(this.versionHero().getByText('Up to date', { exact: true })).toBeVisible()
  }

  async expectVersionHero(installed: string, latest?: string) {
    await expect(this.versionHero().getByText(`v${installed}`, { exact: true })).toBeVisible()
    if (latest) {
      await expect(this.versionHero().getByText('Latest', { exact: true })).toBeVisible()
      await expect(this.versionHero().getByText(`v${latest}`, { exact: true })).toBeVisible()
    } else {
      await expect(this.versionHero().getByText('Latest', { exact: true })).toHaveCount(0)
    }
  }

  async openDetails() {
    const trigger = this.shell().getByRole('button', { name: 'Details' })
    const expanded = await trigger.getAttribute('aria-expanded')
    if (expanded !== 'true') {
      await trigger.click()
    }
  }

  async openReleaseNotes() {
    const trigger = this.shell().getByRole('button', { name: 'Release notes' })
    const expanded = await trigger.getAttribute('aria-expanded')
    if (expanded !== 'true') {
      await trigger.click()
    }
  }

  async expectDetails(expectation: {
    serial: string
    hardware: string
    buildDate?: string
    package?: string
    size?: string
    missingPackage?: boolean
  }) {
    await this.openDetails()
    const grid = this.shell().locator('[class*="detailsGrid"]')
    await expect(grid.getByText(expectation.serial, { exact: true })).toBeVisible()
    await expect(grid.getByText(expectation.hardware, { exact: true })).toBeVisible()
    if (expectation.buildDate) {
      await expect(grid.getByText(expectation.buildDate, { exact: true })).toBeVisible()
    }
    if (expectation.package) {
      await expect(grid.getByText(expectation.package, { exact: true })).toBeVisible()
    }
    if (expectation.size) {
      await expect(grid.getByText(expectation.size, { exact: true })).toBeVisible()
    }
    if (expectation.missingPackage) {
      await expect(grid.getByText('Package', { exact: true })).toHaveCount(0)
      await expect(grid.getByText('Size', { exact: true })).toHaveCount(0)
    }
  }

  async expectReleaseNotes(items: string[], changelogUrl?: string | null) {
    await this.openReleaseNotes()
    const notes = this.shell().locator('[class*="notesList"] [class*="notesItem"]')
    await expect(notes).toHaveCount(items.length)
    for (const item of items) {
      await expect(notes.filter({ hasText: item })).toBeVisible()
    }
    if (changelogUrl) {
      await expect(this.shell().locator(`a[href="${changelogUrl}"]`)).toBeVisible()
    }
  }

  async expectUnsupportedFirmwareBlocked() {
    await this.waitForCheckOutcome('unsupported-fw')
    await this.expectVersionHero('1.5.5')
    await expect(this.primaryButton('Continue')).toHaveCount(0)
    await expect(this.primaryButton('Close')).toBeEnabled()
    await expect(this.shell().getByText(/firmware update docs/)).toBeVisible()
  }

  async expectIncompatibleHardware(hwRevision: string) {
    await this.waitForCheckOutcome('incompatible')
    await expect(
      this.shell().getByText(
        new RegExp(`No signed firmware build for hardware revision ${hwRevision}`),
      ),
    ).toBeVisible()
    await expect(this.primaryButton('Continue')).toHaveCount(0)
    await expect(this.primaryButton('Close')).toBeEnabled()
  }

  headerCloseButton() {
    return this.shell().locator('header').getByLabel('Close', { exact: true })
  }

  primaryButton(label: string | RegExp) {
    return this.shell().locator('[class*="footerActions"]').getByRole('button', { name: label })
  }

  async clickPrimary(label: string | RegExp) {
    await this.primaryButton(label).click()
  }

  async expectPrimaryDisabled(label: string | RegExp, reason?: string | RegExp) {
    await expect(this.primaryButton(label)).toBeDisabled()
    if (reason) {
      await expect(this.footerStatus().getByText(reason)).toBeVisible()
    }
  }

  async waitForDownloading(timeoutMs = 20_000) {
    await expect
      .poll(
        async () => {
          const disabled = await this.primaryButton('Install update').isDisabled()
          const footer = await this.footerStatus().textContent()
          return disabled && /Downloading/i.test(footer ?? '')
        },
        { timeout: timeoutMs },
      )
      .toBe(true)
  }

  preflightDialog(): Locator {
    return this.nestedDialog('Before you update')
  }

  async acknowledgePreflightAndContinue() {
    const dialog = this.preflightDialog()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Continue update' })).toBeDisabled()
    await dialog
      .getByRole('checkbox', {
        name: 'I understand and want to continue with the firmware update.',
      })
      .check()
    await dialog.getByRole('button', { name: 'Continue update' }).click()
    await expect(dialog).toHaveCount(0)
  }

  async cancelPreflightViaButton() {
    const dialog = this.preflightDialog()
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toHaveCount(0)
  }

  async cancelPreflightViaClose() {
    const dialog = this.preflightDialog()
    await dialog.locator('header').getByLabel('Close', { exact: true }).click()
    await expect(dialog).toHaveCount(0)
  }

  async expectPreflightCancelledToCheck() {
    await this.expectOpen()
    await this.waitForActiveStep('Check')
    await expect(this.preflightDialog()).toHaveCount(0)
    await expect(this.primaryButton('Continue')).toBeEnabled()
  }

  async expectPreflightWarning() {
    const dialog = this.preflightDialog()
    await expect(
      dialog.getByText(/Device outputs will be turned off or may become unregulated/),
    ).toBeVisible()
    await expect(
      dialog.getByText(/disconnect from the browser during install and reboot/),
    ).toBeVisible()
  }

  async expectUpToDateState(installedVersion: string) {
    await this.waitForCheckOutcome('up-to-date')
    await this.expectUpToDateBadge()
    await this.expectVersionHero(installedVersion)
    await expect(this.primaryButton('Continue')).toHaveCount(0)
    await expect(this.primaryButton('Close')).toBeEnabled()
  }

  async expectDismissClosesImmediately(method: DismissMethod) {
    await this.dismissMain(method)
    await this.expectClosed()
  }

  async expectGuardedDismiss(
    method: DismissMethod,
    expectation: {
      title: string | RegExp
      body: string | RegExp
      stayLabel: string | RegExp
      leaveLabel: string | RegExp
    },
  ) {
    await this.dismissMain(method)
    await this.expectGuardDialog(expectation)
    await this.stayOnGuard()
    await this.dismissMain(method)
    await this.expectGuardDialog(expectation)
    await this.leaveGuard()
  }

  async waitForDownloadComplete(timeoutMs = 60_000) {
    const downloadStep = this.activeStep('download')
    await expect
      .poll(
        async () => {
          const text = await downloadStep.textContent()
          return text?.includes('100%') === true && text?.includes('Ready') === true
        },
        { timeout: timeoutMs },
      )
      .toBe(true)
  }

  async waitForTransferProgress(timeoutMs = 120_000) {
    await expect(this.activeStep('install').getByText(/Transferring firmware \(\d+\/\d+ bytes\)/)).toBeVisible({
      timeout: timeoutMs,
    })
  }

  async waitForActiveStep(stepLabel: 'Check' | 'Download' | 'Install' | 'Reconnect' | 'Confirm') {
    const key = stepLabel.toLowerCase() as StepKey
    await expect(this.activeStep(key)).toBeVisible({ timeout: 20_000 })
  }

  async waitForReconnectStep(timeoutMs = 120_000) {
    await this.waitForActiveStep('Reconnect')
    await expect(this.activeStep('reconnect').getByText('Ready to reconnect.', { exact: true })).toBeVisible({
      timeout: timeoutMs,
    })
  }

  async dismissMain(method: DismissMethod) {
    if (method === 'escape') {
      await this.page.keyboard.press('Escape')
      return
    }
    if (method === 'close') {
      await this.headerCloseButton().click()
      return
    }
    const overlay = this.page.locator('.mantine-Modal-overlay')
    await overlay.first().click({ position: { x: 8, y: 8 }, force: true })
  }

  async expectGuardDialog(expectation: {
    title: string | RegExp
    body: string | RegExp
    stayLabel: string | RegExp
    leaveLabel: string | RegExp
  }) {
    const dialog = this.nestedDialog(expectation.title)
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(expectation.body)).toBeVisible()
    await expect(dialog.getByRole('button', { name: expectation.stayLabel })).toBeVisible()
    await expect(dialog.getByRole('button', { name: expectation.leaveLabel })).toBeVisible()
  }

  async stayOnGuard() {
    const dialog = this.page
      .getByRole('dialog')
      .filter({
        has: this.page.getByText(/Cancel download\?|Cancel firmware update\?|Leave before/),
      })
      .last()
    await dialog.getByRole('button', { name: /Keep downloading|Keep installing|Stay and/ }).click()
    await expect(dialog).toHaveCount(0)
    await this.expectOpen()
  }

  async leaveGuard() {
    const dialog = this.page
      .getByRole('dialog')
      .filter({
        has: this.page.getByText(/Cancel download\?|Cancel firmware update\?|Leave before/),
      })
      .last()
    await dialog.getByRole('button', { name: /Cancel download|Close anyway/ }).click()
    await expect(dialog).toHaveCount(0)
    await this.expectClosed()
  }

  async clickCheckAgain() {
    await this.activeStep('check').getByRole('button', { name: 'Check again' }).click()
  }

  async expectVerifySuccess(version: string) {
    await this.waitForActiveStep('Confirm')
    const confirmStep = this.activeStep('confirm')
    await expect(confirmStep.getByText('Update successful', { exact: true })).toBeVisible()
    await expect(confirmStep.getByText(`Running v${version}.`, { exact: true })).toBeVisible()
    await expect(this.primaryButton('Complete')).toBeEnabled()
  }

  async expectVersionMismatch(expected: string, found: string) {
    await this.waitForActiveStep('Confirm')
    await expect(this.activeStep('confirm').getByText('Version mismatch.', { exact: true })).toBeVisible()
    await expect(this.footerStatus().getByText(new RegExp(`expected v${expected}`, 'i'))).toBeVisible()
    await expect(this.footerStatus().getByText(new RegExp(`found v${found}`, 'i'))).toBeVisible()
    await expect(this.primaryButton('Select device')).toBeEnabled()
  }
}
