import { expect, test } from '@playwright/test'
import { login, noHorizontalScroll, screenshot } from './helpers'

test('E2E-03 requester dashboard is role-scoped and responsive', async ({ page }, testInfo) => {
  await login(page, 'niran.somchai@example.test', testInfo)
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Requester Dashboard' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recently resolved' }).last()).toBeVisible()
  await expect(page.getByRole('button', { name: 'View tickets' }).first()).toBeVisible()
  await noHorizontalScroll(page)
  await screenshot(page, testInfo, 'requester-dashboard', 'dashboard')
})

test('E2E-03 staff dashboard shows aggregates and drill-down actions', async ({ page }, testInfo) => {
  await login(page, 'staff1@example.test', testInfo)
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'IT Staff Dashboard' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tickets by status' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tickets by IT priority' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View queue' }).first()).toBeVisible()
  await noHorizontalScroll(page)
  await screenshot(page, testInfo, 'staff-dashboard', 'dashboard')
})
