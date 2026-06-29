import { test as base } from '@playwright/test'

import { AppPage } from '../pages/app.page'
import { ControlsPage } from '../pages/controls.page'
import { DocsPage } from '../pages/docs.page'
import { GraphsPage } from '../pages/graphs.page'
import { LabPage } from '../pages/lab.page'
import { TelemetryPage } from '../pages/telemetry.page'

type AppFixtures = {
  app: AppPage
  controls: ControlsPage
  graphs: GraphsPage
  lab: LabPage
  telemetry: TelemetryPage
  docs: DocsPage
}

export const test = base.extend<AppFixtures>({
  app: async ({ page }, use) => {
    await use(new AppPage(page))
  },
  controls: async ({ page }, use) => {
    await use(new ControlsPage(page))
  },
  graphs: async ({ page }, use) => {
    await use(new GraphsPage(page))
  },
  telemetry: async ({ page }, use) => {
    await use(new TelemetryPage(page))
  },
  lab: async ({ page }, use) => {
    await use(new LabPage(page))
  },
  docs: async ({ page }, use) => {
    await use(new DocsPage(page))
  },
})

export { expect } from '@playwright/test'
