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

  test('navigates between standard lab pages', async ({ lab }) => {
    await lab.expectDevicesEmptyState()
    await lab.expectSidebarLinkActive('Devices')

    await lab.openControls()
    await lab.expectControlsEmptyState()
    await lab.expectSidebarLinkActive('Controls')

    await lab.openGraphs()
    await lab.expectGraphsEmptyState()
    await lab.expectSidebarLinkActive('Graphs')

    await lab.openDevices()
    await lab.expectDevicesEmptyState()
  })

  test('shows telemetry only in engineering view', async ({ page, lab }) => {
    await expect(page.getByRole('link', { name: 'Telemetry' })).toHaveCount(0)

    await lab.setEngineeringView()
    await expect(page.getByRole('link', { name: 'Telemetry' })).toBeVisible()

    await lab.openTelemetry()
    await lab.expectTelemetryEmptyState()
    await lab.expectSidebarLinkActive('Telemetry')
  })
})
