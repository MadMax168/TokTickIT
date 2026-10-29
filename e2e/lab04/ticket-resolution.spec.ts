import { expect, test } from '@playwright/test'
import { login, noHorizontalScroll, screenshot } from './helpers'

test('E2E-02 permitted workflow transition succeeds', async ({ page }, testInfo) => {
  await login(page, 'staff1@example.test', testInfo)
  await page.getByRole('link', { name: 'Ticket Queue' }).click()
  await page.locator('tbody tr').filter({ hasText: 'TT-20260901-SEEDLA' }).getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('heading', { name: /TT-/ })).toBeVisible()
  const status = page.getByLabel('Status')
  const current = await status.inputValue()
  const target = current === 'WAITING_FOR_REQUESTER' ? 'IN_PROGRESS' : current === 'IN_PROGRESS' ? 'WAITING_FOR_REQUESTER' : 'OPEN'
  await status.selectOption(target)
  await expect(status).toHaveValue(target)
  await noHorizontalScroll(page)
  await screenshot(page, testInfo, 'actions-taken', 'workflow-transition')
})
