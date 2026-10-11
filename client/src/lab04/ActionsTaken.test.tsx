import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ActionsTaken } from './ActionsTaken'

describe('UI-01/UI-04/UI-05/UI-06: Actions Taken', () => {
  it('renders ordered actions and keeps Requester view read-only', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ id: 1, ticketId: 10, actionDateTime: '2026-10-11T01:00:00Z', actionDescription: 'Checked', result: 'Ready', performedBy: { id: 2, name: 'Staff', role: 'IT_STAFF' }, assignee: { id: 2, name: 'Staff', role: 'IT_STAFF', active: true }, followUpRequired: false, version: 1 }] }) }))
    render(<ActionsTaken ticketId={10} readOnly />)
    await waitFor(() => expect(screen.getByText('Checked')).toBeInTheDocument())
    expect(screen.queryByText('Add Action Taken')).not.toBeInTheDocument()
  })

  it('UI-01: hydrates the existing action before an edit save', async () => {
    const action = { id: 1, ticketId: 10, actionDateTime: '2026-10-11T01:00:00Z', actionDescription: 'Checked', result: 'Ready', performedBy: { id: 2, name: 'Staff', role: 'IT_STAFF' }, assignee: { id: 2, name: 'Staff', role: 'IT_STAFF', active: true }, followUpRequired: true, followUpNote: 'Monitor', attachmentNotes: 'None', version: 3 }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [action] }) }))
    render(<ActionsTaken ticketId={10} assignees={[action.assignee]} />)
    await waitFor(() => expect(screen.getByText('Checked')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByDisplayValue('Checked')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Ready')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Monitor')).toBeInTheDocument()
  })
})
