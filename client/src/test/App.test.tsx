import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('App', () => {
  it('renders the service desk heading', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'TokTickIT IT Service Desk' })).toBeInTheDocument();
  });

  it('shows a loading state after Check System is clicked', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Check System' }));

    expect(screen.getByRole('status')).toHaveTextContent('⏳ Loading…');
    expect(fetchSpy).toHaveBeenCalledWith('/api/health');
  });

  it('shows an error message when the health check rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Check System' }));

    await waitFor(() => {
      expect(screen.getByText('Unable to connect to TokTickIT API')).toBeInTheDocument();
    });
    expect(screen.getByText('System Status: Offline')).toBeInTheDocument();
  });
});

describe('UI-04: Category list displays', () => {
  it('shows categories after successful response', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 1, name: 'Account and Access' },
          { id: 2, name: 'Hardware' },
          { id: 3, name: 'Software' },
          { id: 4, name: 'Network' },
        ],
      } as Response);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Check System' }));

    expect(await screen.findByText('Supported Request Categories')).toBeInTheDocument();
    expect(screen.getByText('Account and Access')).toBeInTheDocument();
  });
});

describe('UI-05: Categories from API not hardcoded', () => {
  it('displays category name returned by mock', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 99, name: 'Mocked Category' }],
      } as Response);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Check System' }));

    expect(await screen.findByText('Mocked Category')).toBeInTheDocument();
  });
});
