import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { expect, test, type Page, type TestInfo } from '@playwright/test'

const requesterA = 'Niran Somchai'
const requesterB = 'Aree Chai'

async function capture(page: Page, testInfo: TestInfo, screen: 'create-ticket' | 'my-tickets' | 'ticket-detail', state: string) {
  const path = join('artifacts', 'lab02', 'screenshots', screen, `${testInfo.project.name}-${state}.png`)
  await mkdir(dirname(path), { recursive: true })
  await page.screenshot({ path, fullPage: true })
}

async function selectRequester(page: Page, name: string) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Choose a Development Requester' })).toBeVisible()
  await page.getByLabel('Development Requester', { exact: true }).selectOption({ label: name })
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText(`Development Requester: ${name}`)).toBeVisible()
}

async function createTicket(page: Page, testInfo: TestInfo, summary: string, attachments: Array<{ name: string; mimeType: string; buffer: Buffer }> = []) {
  await page.getByRole('navigation', { name: 'Requester navigation' }).getByRole('button', { name: 'Create Ticket' }).click()
  await expect(page.getByRole('heading', { name: 'Create Ticket' })).toBeVisible()
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Category is required.')).toBeVisible()
  await capture(page, testInfo, 'create-ticket', 'validation')
  await page.getByLabel('Category').selectOption({ label: 'Software' })
  await page.getByLabel('Related System').selectOption({ label: 'Email' })
  await page.getByLabel('Requested Priority').selectOption('MEDIUM')
  await page.getByLabel('Summary').fill(summary)
  await page.getByLabel('Description').fill('The requester needs help with this reproducible Lab 2 ticket scenario.')
  if (attachments.length > 0) await page.getByLabel('Attachments').setInputFiles(attachments)
  await page.getByRole('button', { name: 'Submit' }).click()
  const ticketNumber = page.locator('.create-ticket-success strong')
  await expect(ticketNumber).toHaveText(/^TT-\d{8}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
  await capture(page, testInfo, 'create-ticket', attachments.length > 0 ? 'success-with-attachment' : 'success')
  return ticketNumber.textContent().then((value) => value ?? '')
}

test('E2E-01: a requester can create, find, open, and isolate an owned ticket', async ({ page }, testInfo) => {
  await selectRequester(page, requesterA)
  const ticketNumber = await createTicket(page, testInfo, 'E2E requester ownership ticket')

  await page.getByRole('button', { name: 'My Tickets' }).click()
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible()
  await expect(page.getByText(ticketNumber)).toBeVisible()
  await capture(page, testInfo, 'my-tickets', 'populated')

  await page.getByLabel('Search').fill('does-not-match')
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page.getByText('No matches for this search or filter.')).toBeVisible()
  await capture(page, testInfo, 'my-tickets', 'no-results')
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByText(ticketNumber)).toBeVisible()

  await page.getByRole('button', { name: `Open Ticket ${ticketNumber}` }).click()
  await expect(page.getByRole('heading', { name: ticketNumber })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Summary' })).toHaveValue('E2E requester ownership ticket')
  await expect(page.getByRole('textbox', { name: 'Summary' })).toHaveAttribute('readonly', '')
  await capture(page, testInfo, 'ticket-detail', 'active')

  await page.getByRole('button', { name: 'Back to My Tickets' }).click()
  await page.getByRole('button', { name: 'Change Requester' }).click()
  await page.getByLabel('Development Requester', { exact: true }).selectOption({ label: requesterB })
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('navigation', { name: 'Requester navigation' }).getByRole('button', { name: 'My Tickets' }).click()
  await expect(page.getByText('No tickets yet.')).toBeVisible()
  await expect(page.getByText(ticketNumber)).toHaveCount(0)
  await capture(page, testInfo, 'my-tickets', 'empty')
})

test('E2E-02: a requester can upload, download, and soft-remove an attachment', async ({ page }, testInfo) => {
  await selectRequester(page, requesterA)
  await page.getByRole('navigation', { name: 'Requester navigation' }).getByRole('button', { name: 'Create Ticket' }).click()
  await expect(page.getByRole('heading', { name: 'Create Ticket' })).toBeVisible()
  await page.getByLabel('Attachments').setInputFiles({ name: 'not-permitted.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('invalid') })
  await expect(page.getByText('Only JPG, JPEG, PNG, WEBP, and PDF files are allowed.')).toBeVisible()
  await capture(page, testInfo, 'create-ticket', 'invalid-attachment')
  await page.getByLabel('Attachments').setInputFiles([])
  await page.getByRole('navigation', { name: 'Requester navigation' }).getByRole('button', { name: 'My Tickets' }).click()
  await createTicket(page, testInfo, 'E2E attachment lifecycle ticket', [{
    name: 'e2e-evidence.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 E2E attachment evidence'),
  }])

  await expect(page.getByText('e2e-evidence.pdf', { exact: true })).toBeVisible()
  const createdNumber = await page.locator('.create-ticket-success strong').textContent()
  await page.getByRole('button', { name: 'My Tickets' }).click()
  await page.getByRole('button', { name: `Open Ticket ${createdNumber}` }).click()
  await expect(page.getByRole('heading', { name: createdNumber ?? '' })).toBeVisible()
  await capture(page, testInfo, 'ticket-detail', 'active-attachment')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download e2e-evidence.pdf' }).click()
  expect((await download).suggestedFilename()).toBe('e2e-evidence.pdf')

  await page.getByRole('button', { name: 'Remove e2e-evidence.pdf' }).click()
  await page.getByRole('textbox', { name: 'Removal reason' }).fill('Evidence was replaced')
  await page.getByRole('button', { name: 'Confirm removal' }).click()
  await expect(page.getByText('Attachment removed.')).toBeVisible()
  await expect(page.getByText('Removed: Evidence was replaced. Download unavailable.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download e2e-evidence.pdf' })).toHaveCount(0)
  await capture(page, testInfo, 'ticket-detail', 'removed-blocked-download')
})
