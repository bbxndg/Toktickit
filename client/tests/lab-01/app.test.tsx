import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../../src/App';

describe('TokTickIT Health Check UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the TokTickIT heading and Check System button', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /TokTickIT/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check System/i })).toBeInTheDocument();
  });

  it('displays Online status when API health check succeeds', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'ok', service: 'TokTickIT API' }),
    } as Response);

    render(<App />);
    const button = screen.getByRole('button', { name: /Check System/i });
    await user.click(button);

    await waitFor(() => {
      const statusMsg = screen.getByTestId('status-message');
      expect(statusMsg).toHaveTextContent('System Status: Online');
      expect(statusMsg).toHaveTextContent('Connected to TokTickIT API');
    });
  });

  it('displays useful Offline error message when API is unreachable', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    const button = screen.getByRole('button', { name: /Check System/i });
    await user.click(button);

    await waitFor(() => {
      const statusMsg = screen.getByTestId('status-message');
      expect(statusMsg).toHaveTextContent('System Status: Offline');
      expect(statusMsg).toHaveTextContent('Unable to connect to TokTickIT API');
    });
  });
});
