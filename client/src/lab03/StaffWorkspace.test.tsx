import { render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { vi, test, expect, afterEach } from 'vitest'
import StaffWorkspace from './StaffWorkspace'
afterEach(() => vi.restoreAllMocks())
test('queue opens a staff ticket detail and exposes workflow controls', async () => {
  vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve({ ok: true, json: async () => url === '/api/staff/tickets' ? { items: [{ id: 1, ticketNumber: 'TK-1', summary: 'Printer', requestedPriority: 'HIGH', itPriority: 'HIGH', currentStatus: 'NEW', version: 1 }] } : url.includes('/comments') ? { items: [] } : url.includes('/internal-notes') ? { items: [] } : url === '/api/staff/assignees' ? { items: [] } : { id: 1, ticketNumber: 'TK-1', summary: 'Printer', description: 'Details', requestedPriority: 'HIGH', itPriority: 'HIGH', currentStatus: 'NEW', version: 1, attachments: [] } })))
  function Harness(){const [path,setPath]=useState('/staff/tickets');return <StaffWorkspace path={path} csrfToken="csrf" onNavigate={setPath} />}
  render(<Harness />)
  await waitFor(() => expect(screen.getByText('TK-1')).toBeInTheDocument())
  screen.getByRole('button', { name: 'Open' }).click()
  await waitFor(() => expect(screen.getByText('Ownership and workflow')).toBeInTheDocument())
  expect(screen.getByText('Post public comment')).toBeInTheDocument()
  expect(screen.getByText('Add internal note')).toBeInTheDocument()
})
