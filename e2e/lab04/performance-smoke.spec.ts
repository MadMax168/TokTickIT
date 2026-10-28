import { expect, test } from '@playwright/test'
import { login } from './helpers'

test('PERF-01 key Lab 4 endpoints respond within the smoke threshold', async ({ page }) => {
  await login(page, 'staff1@example.test')
  const endpoints = ['/api/tickets/1', '/api/staff/dashboard', '/api/tickets/1/actions-taken']
  for (const endpoint of endpoints) {
    const start = Date.now()
    const response = await page.request.get(endpoint)
    expect(response.status(), endpoint).toBeLessThan(500)
    expect(Date.now() - start, endpoint).toBeLessThan(5000)
  }
})
