import { test as base } from '@playwright/test'

import { AppPage } from '../pages/app.page'
import { DocsPage } from '../pages/docs.page'
import { LabPage } from '../pages/lab.page'

type AppFixtures = {
  app: AppPage
  lab: LabPage
  docs: DocsPage
}

export const test = base.extend<AppFixtures>({
  app: async ({ page }, use) => {
    await use(new AppPage(page))
  },
  lab: async ({ page }, use) => {
    await use(new LabPage(page))
  },
  docs: async ({ page }, use) => {
    await use(new DocsPage(page))
  },
})

export { expect } from '@playwright/test'
