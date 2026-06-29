import { expect, test } from '../../fixtures/test-base'

test.describe('Browser compatibility', () => {
  test('loads the home page', async ({ page, app }) => {
    await app.gotoHome()
    await expect(page).toHaveTitle(/ProtoV/i)
    await expect(page.getByRole('banner')).toBeVisible()
  })

  test('loads lab and docs routes', async ({ page, app, lab, docs }) => {
    await lab.gotoDevices()
    await lab.expectDevicesEmptyState()

    await app.clickNavLink('Docs')
    await docs.expectOverview()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('exposes the Web Serial API on modern desktop browsers', async ({ page, browserName }) => {
    await page.goto('/')
    const supported = await page.evaluate(
      () => typeof navigator !== 'undefined' && 'serial' in navigator,
    )
    expect(
      supported,
      `${browserName} should expose navigator.serial (Web Serial API)`,
    ).toBe(true)
  })
})
