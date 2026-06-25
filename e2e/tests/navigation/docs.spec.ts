import { expect, test } from '../../fixtures/test-base'

test.describe('Docs sidebar', () => {
  test.beforeEach(async ({ docs }) => {
    await docs.gotoOverview()
  })

  test('loads the docs overview', async ({ page, docs }) => {
    await docs.expectOverview()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('navigates between doc pages', async ({ page, docs }) => {
    await docs.openGettingStarted()
    await expect(page.getByRole('heading', { name: 'Getting Started' })).toBeVisible()

    await docs.openHardware()
    await expect(page.getByRole('heading', { name: 'Hardware' })).toBeVisible()
  })
})
