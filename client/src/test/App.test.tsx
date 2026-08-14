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
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Check System' }));

    expect(screen.getByRole('status')).toHaveTextContent('⏳ Loading…');
    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:3000/api/health');
  });

  it('shows an error message when the health check rejects', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Check System' }));

    await waitFor(() => {
      expect(screen.getByText('Unable to connect to TokTickIT API')).toBeInTheDocument();
    });
    expect(screen.getByText('System Status: Offline')).toBeInTheDocument();
  });
});
