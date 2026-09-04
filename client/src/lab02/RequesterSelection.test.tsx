import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RequesterApplication from './RequesterApplication'

function renderSelection() {
  return render(<RequesterApplication />)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('UI-01 and UI-02: Requester Selection', () => {
  it('loads active Requesters, keeps Continue disabled until selection, and supports Change Requester', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: 2, name: 'Aree Chai', email: 'aree.chai@example.test' }],
      }),
    } as Response)

    renderSelection()

    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    const continueButton = await screen.findByRole('button', { name: 'Continue' })
    expect(continueButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Development Requester'), { target: { value: '2' } })
    expect(continueButton).toBeEnabled()
    fireEvent.click(continueButton)

    expect(screen.getByText('Development Requester: Aree Chai')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Change Requester' }))

    expect(await screen.findByRole('combobox', { name: 'Development Requester' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it('shows empty and retryable API-failure states without browser storage', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: { code: 'REFERENCE_DATA_UNAVAILABLE' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) } as Response)
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')

    renderSelection()

    expect(await screen.findByText('No active Development Requesters are available.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load Development Requesters.')

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3))
    expect(storageSpy).not.toHaveBeenCalled()
  })
})
