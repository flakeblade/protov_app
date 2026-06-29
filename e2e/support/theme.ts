import type { Page } from '@playwright/test'

export type ColorScheme = 'light' | 'dark'

const STORAGE_KEY = 'mantine-color-scheme-value'

/** Pin Mantine to light mode before the app boots (call before the first navigation). */
export async function seedLightColorScheme(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem(key, 'light')
  }, STORAGE_KEY)
}
