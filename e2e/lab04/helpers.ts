import { expect, type Page, type TestInfo } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const password = 'Lab4E2E!Password2026'

export async function login(page: Page, email: string, testInfo?: TestInfo) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const change = page.getByRole('heading', { name: 'Change Password' })
  if (await change.isVisible().catch(() => false)) {
    const replacement = `${password}x`
    await page.getByLabel('Current password', { exact: true }).fill(password)
    await page.getByLabel('New password', { exact: true }).fill(replacement)
    await page.getByLabel('Confirm new password', { exact: true }).fill(replacement)
    await page.getByRole('button', { name: 'Save password' }).click()
  }
  if (testInfo) await expect(page.locator('body')).not.toContainText('Access unavailable')
}

export async function screenshot(page: Page, testInfo: TestInfo, screen: string, name: string) {
  const path = join('artifacts', 'lab04', 'screenshots', screen, `${testInfo.project.name}-${name}.png`)
  await mkdir(dirname(path), { recursive: true })
  await page.screenshot({ path, fullPage: true })
  return path
}

export async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}
