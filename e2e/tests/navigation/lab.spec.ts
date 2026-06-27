import { expect, test } from '../../fixtures/test-base'
import { routes } from '../../support/constants'

test.describe('Lab sidebar', () => {
  test.beforeEach(async ({ lab }) => {
    await lab.gotoDevices()
  })

  test('redirects /lab to devices', async ({ page }) => {
    await page.goto(routes.lab.root)
    await expect(page).toHaveURL(/\/lab\/devices$/)
  })

  test('navigates between standard lab pages', async ({ page, lab }) => {
    await lab.expectDevices()
    await expect(page.getByText('ProtoV MINI').first()).toBeVisible()

    await lab.openControls()
    await expect(page.getByText('No devices connected').first()).toBeVisible()

    await lab.openGraphs()
    await expect(page.getByText('No devices connected').first()).toBeVisible()

    await lab.openDevices()
    await lab.expectDevices()
  })

  test('shows telemetry only in engineering view', async ({ page, lab }) => {
    await expect(page.getByRole('link', { name: 'Telemetry' })).toHaveCount(0)

    await lab.setEngineeringView()
    await expect(page.getByRole('link', { name: 'Telemetry' })).toBeVisible()

    await lab.openTelemetry()
    await expect(page.getByText('No devices connected')).toBeVisible()
  })
})
