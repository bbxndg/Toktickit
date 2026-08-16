import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../../src/App';

describe('TokTickIT UI Tests (Lab 1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // UI-01: Heading and button rendering
  it('UI-01: renders the TokTickIT heading and Check System button', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /TokTickIT/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check System/i })).toBeInTheDocument();
  });

  // UI-02: Loading state transitions to category list display
  it('UI-02: transitions from loading state to displaying categories on successful API call', async () => {
    const user = userEvent.setup();
    const mockCategories = [
      { id: 1, name: 'Account and Access' },
      { id: 2, name: 'Hardware' },
      { id: 3, name: 'Software' },
      { id: 4, name: 'Network' },
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'ok', service: 'TokTickIT API' }),
        } as Response);
      }
      if (url.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCategories,
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<App />);
    const button = screen.getByRole('button', { name: /Check System/i });
    await user.click(button);

    // Verify online status is displayed
    await waitFor(() => {
      const statusMsg = screen.getByTestId('status-message');
      expect(statusMsg).toHaveTextContent('System Status: Online');
      expect(statusMsg).toHaveTextContent('Connected to TokTickIT API');
    });

    // Verify category list is displayed with all 4 categories
    const categoryList = screen.getByTestId('category-list');
    expect(categoryList).toBeInTheDocument();

    const categoryItems = screen.getAllByTestId('category-item');
    expect(categoryItems).toHaveLength(4);
    expect(screen.getByText('Account and Access')).toBeInTheDocument();
    expect(screen.getByText('Hardware')).toBeInTheDocument();
    expect(screen.getByText('Software')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
  });

  // UI-03: Displays useful error message when API fails
  it('UI-03: displays useful Offline error message when API is unreachable', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network connection failed'));

    render(<App />);
    const button = screen.getByRole('button', { name: /Check System/i });
    await user.click(button);

    await waitFor(() => {
      const statusMsg = screen.getByTestId('status-message');
      expect(statusMsg).toHaveTextContent('System Status: Offline');
    });
  });
});
