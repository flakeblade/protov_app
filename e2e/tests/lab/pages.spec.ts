import { expect, test } from '../../fixtures/test-base'

test.describe('Lab devices page', () => {
  test('shows connect card when no devices are connected', async ({ lab }) => {
    await lab.gotoDevices()
    await lab.expectDevicesEmptyState()
  })

  test('lists standard sidebar destinations', async ({ page, lab }) => {
    await lab.gotoDevices()

    await expect(page.getByRole('link', { name: 'Devices' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Controls' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Graphs' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Telemetry' })).toHaveCount(0)
  })
})

test.describe('Lab controls page', () => {
  test('shows empty state when no devices are connected', async ({ lab }) => {
    await lab.gotoControls()
    await lab.expectControlsEmptyState()
  })

  test('Go to Devices returns to the devices page', async ({ lab }) => {
    await lab.gotoControls()
    await lab.clickGoToDevices()
    await lab.expectDevicesEmptyState()
  })
})

test.describe('Lab graphs page', () => {
  test('shows empty state when no devices are connected', async ({ lab }) => {
    await lab.gotoGraphs()
    await lab.expectGraphsEmptyState()
  })

  test('Go to Devices returns to the devices page', async ({ lab }) => {
    await lab.gotoGraphs()
    await lab.clickGoToDevices()
    await lab.expectDevicesEmptyState()
  })
})

test.describe('Lab telemetry page', () => {
  test.beforeEach(async ({ lab }) => {
    await lab.gotoDevices()
    await lab.setEngineeringView()
  })

  test('shows empty state when no devices are connected', async ({ lab }) => {
    await lab.gotoTelemetry()
    await lab.expectTelemetryEmptyState()
  })

  test('Go to Devices returns to the devices page', async ({ lab }) => {
    await lab.gotoTelemetry()
    await lab.clickGoToDevices()
    await lab.expectDevicesEmptyState()
  })
})
