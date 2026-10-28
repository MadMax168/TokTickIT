import { expect, test } from '@playwright/test'
import { login, noHorizontalScroll, screenshot } from './helpers'

test('E2E-02 permitted workflow transition succeeds', async ({ page }, testInfo) => {
  await login(page, 'staff1@example.test', testInfo)
  await page.getByRole('link', { name: 'Ticket Queue' }).click()
  await page.getByRole('button', { name: 'Open' }).first().click()
  await expect(page.getByRole('heading', { name: /TT-/ })).toBeVisible()
  const status = page.getByLabel('Status')
  await expect(status).toHaveValue('NEW')
  await status.selectOption('OPEN')
  await expect(status).toHaveValue('OPEN')
  await noHorizontalScroll(page)
  await screenshot(page, testInfo, 'actions-taken', 'workflow-transition')
})
