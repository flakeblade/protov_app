import { expect, test } from '../../fixtures/test-base'

test.describe('WebKit (Safari)', () => {
  test('loads the home page and docs', async ({ page, app, docs }) => {
    await app.gotoHome()
    await expect(page).toHaveTitle(/ProtoV/i)
    await expect(page.getByRole('banner')).toBeVisible()

    await app.clickNavLink('Docs')
    await docs.expectOverview()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('shows an unsupported notice instead of lab features', async ({ lab }) => {
    await lab.gotoDevices()
    await lab.expectLabUnsupported()
  })
})
