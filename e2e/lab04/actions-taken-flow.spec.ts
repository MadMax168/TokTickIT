import { expect, test } from '@playwright/test'
import { login, noHorizontalScroll, screenshot } from './helpers'

test('E2E-01 staff can create and edit Actions Taken', async ({ page }, testInfo) => {
  await login(page, 'staff1@example.test', testInfo)
  await page.getByRole('link', { name: 'Ticket Queue' }).click()
  await page.getByRole('button', { name: 'Open' }).first().click()
  await expect(page.getByRole('heading', { name: /TT-/ })).toBeVisible()
  await page.getByLabel('Date/time').fill('2026-10-28T10:00')
  await page.getByLabel('Description').fill('Reviewed the reported issue')
  await page.getByLabel('Result').fill('The issue was reproduced and documented')
  await page.getByLabel('Assignee').selectOption({ label: /Staff One/ })
  await page.getByRole('button', { name: 'Save Action Taken' }).click()
  await expect(page.getByText('Reviewed the reported issue')).toBeVisible()
  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByDisplayValue('Reviewed the reported issue')).toBeVisible()
  await page.getByLabel('Description').fill('Reviewed and resolved the reported issue')
  await page.getByRole('button', { name: 'Save Action Taken' }).click()
  await expect(page.getByText('Reviewed and resolved the reported issue')).toBeVisible()
  await noHorizontalScroll(page)
  await screenshot(page, testInfo, 'actions-taken', 'staff-detail')
})
