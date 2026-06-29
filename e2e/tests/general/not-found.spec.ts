import { expect, test } from '../../fixtures/test-base'

test.describe('Not found page', () => {
  test('shows a 404 for unknown top-level routes', async ({ page, app }) => {
    await app.gotoNotFound('/this-page-does-not-exist')
    await expect(page).toHaveURL(/\/this-page-does-not-exist$/)
    await app.expectNotFoundPage()
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('main').getByRole('img', { name: 'ProtoV' })).toBeVisible()
  })

  test('Go home returns to the homepage', async ({ app, page }) => {
    await app.gotoNotFound('/missing-route')
    await app.expectNotFoundPage()
    await page.getByRole('main').getByRole('link', { name: 'Go home' }).click()
    await app.expectHome()
  })

  test('shows a 404 for unknown lab routes', async ({ page, app }) => {
    await app.gotoNotFound('/lab/not-a-lab-page')
    await expect(page).toHaveURL(/\/lab\/not-a-lab-page$/)
    await app.expectNotFoundPage()
  })
})
