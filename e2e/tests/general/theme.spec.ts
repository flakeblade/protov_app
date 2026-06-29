import { expect, test } from '../../fixtures/test-base'
import { seedLightColorScheme } from '../../support/theme'

test.describe('Color scheme toggle', () => {
  test.beforeEach(async ({ page }) => {
    await seedLightColorScheme(page)
  })

  test('home page', async ({ app }) => {
    await app.gotoHome()
    await expect(app.themeToggle()).toBeVisible()
    await app.expectColorScheme('light')
    await app.toggleColorScheme()
    await app.expectColorScheme('dark')
    await app.toggleColorScheme()
    await app.expectColorScheme('light')
  })

  test('docs overview', async ({ app, docs }) => {
    await docs.gotoOverview()
    await app.expectColorScheme('light')
    await app.toggleColorScheme()
    await app.expectColorScheme('dark')
  })

  test('docs getting started', async ({ app, docs }) => {
    await docs.gotoOverview()
    await docs.openGettingStarted()
    await app.expectColorScheme('light')
    await app.toggleColorScheme()
    await app.expectColorScheme('dark')
  })

  test('docs hardware', async ({ app, docs }) => {
    await docs.gotoOverview()
    await docs.openHardware()
    await app.expectColorScheme('light')
    await app.toggleColorScheme()
    await app.expectColorScheme('dark')
  })

  test('lab devices page', async ({ app, lab }) => {
    await lab.gotoDevices()
    await lab.expectDevicesEmptyState()
    await app.expectColorScheme('light')
    await app.toggleColorScheme()
    await app.expectColorScheme('dark')
  })

  test('lab controls page', async ({ app, lab }) => {
    await lab.gotoControls()
    await lab.expectControlsEmptyState()
    await app.expectColorScheme('light')
    await app.toggleColorScheme()
    await app.expectColorScheme('dark')
  })

  test('lab graphs page', async ({ app, lab }) => {
    await lab.gotoGraphs()
    await lab.expectGraphsEmptyState()
    await app.expectColorScheme('light')
    await app.toggleColorScheme()
    await app.expectColorScheme('dark')
  })

  test('lab telemetry page', async ({ app, lab }) => {
    await lab.gotoDevices()
    await lab.setEngineeringView()
    await lab.gotoTelemetry()
    await lab.expectTelemetryEmptyState()
    await app.expectColorScheme('light')
    await app.toggleColorScheme()
    await app.expectColorScheme('dark')
  })
})
