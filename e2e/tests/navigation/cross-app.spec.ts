import { expect, test } from '../../fixtures/test-base'

test.describe('Cross-app navigation', () => {
  test('moves home → lab → docs → home', async ({ page, app, lab, docs }) => {
    await app.gotoHome()
    await app.expectHome()

    await app.clickNavLink('Lab')
    await lab.expectDevices()

    await lab.openControls()
    await lab.expectControls()

    await app.clickNavLink('Docs')
    await docs.expectOverview()

    await docs.openGettingStarted()
    await docs.expectGettingStarted()

    await app.clickNavLink('Home')
    await app.expectHome()
    await expect(page).toHaveURL(/\/$/)
  })

  test('moves lab → home → lab and preserves devices route', async ({ app, lab }) => {
    await lab.gotoDevices()
    await lab.expectDevices()

    await app.clickNavLink('Home')
    await app.expectHome()

    await app.clickNavLink('Lab')
    await lab.expectDevices()
  })

  test('returns to the last lab page after visiting docs', async ({ app, lab, docs }) => {
    await lab.gotoControls()
    await lab.expectControls()

    await app.clickNavLink('Docs')
    await docs.expectOverview()

    await app.clickNavLink('Lab')
    await lab.expectControls()
  })

  test('returns to the last docs page after visiting lab', async ({ app, lab, docs }) => {
    await docs.gotoOverview()
    await docs.openHardware()
    await docs.expectHardware()

    await app.clickNavLink('Lab')
    await lab.expectDevices()

    await app.clickNavLink('Docs')
    await docs.expectHardware()
  })
})
