import { expect, test } from '../../fixtures/test-base'

test.describe('Home', () => {
  test('loads the marketing homepage', async ({ page, app }) => {
    await app.gotoHome()
    await expect(page).toHaveTitle(/ProtoV/i)
    await expect(page.getByRole('banner')).toBeVisible()
  })

  test('navigates to Lab from the navbar', async ({ app }) => {
    await app.gotoHome()
    await app.clickNavLink('Lab')
    await app.expectLab()
  })

  test('navigates to Docs from the navbar', async ({ page, app }) => {
    await app.gotoHome()
    await app.clickNavLink('Docs')
    await app.expectDocs()
    await expect(page).toHaveURL(/\/docs\/?$/)
  })
})
