import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

const mockRequester = {
  id: 1,
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@toktickit.local',
  department: 'Human Resources',
  isActive: true,
};

const mockCategories = [
  { id: 1, name: 'Account and Access' },
  { id: 2, name: 'Hardware' },
];

const mockSystems = [
  { id: 1, name: 'Corporate Laptop' },
  { id: 2, name: 'Email' },
];

describe('Create Ticket Screen (Create Mode)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('toktickit_dev_requester', JSON.stringify(mockRequester));
    vi.restoreAllMocks();
  });

  it('UI-01: renders Create Ticket form with read-only fields and reference data loaded', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/categories')) {
        return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
      }
      if (urlStr.includes('/api/related-systems')) {
        return Promise.resolve(new Response(JSON.stringify(mockSystems), { status: 200 }));
      }
      if (urlStr.includes('/api/requesters')) {
        return Promise.resolve(new Response(JSON.stringify([mockRequester]), { status: 200 }));
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const user = userEvent.setup();
    render(<App />);

    // Click nav link to go to Create Ticket
    const navCreateBtn = screen.getByTestId('nav-create-ticket');
    await user.click(navCreateBtn);

    // Form should be rendered
    expect(screen.getByRole('heading', { name: 'Create IT Support Ticket' })).toBeInTheDocument();

    // Verify Read-only Requester field displays Jennifer Anderson
    const requesterField = screen.getByTestId('ticket-requester-field');
    expect(requesterField).toHaveValue('Jennifer Anderson');
    expect(requesterField).toBeDisabled();

    // Verify options loaded
    await waitFor(() => {
      expect(screen.getByTestId('category-select')).toBeInTheDocument();
      expect(screen.getByText('Hardware')).toBeInTheDocument();
      expect(screen.getByText('Corporate Laptop')).toBeInTheDocument();
    });
  });

  it('UI-02: shows field-level validation errors when submitting empty form', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/categories')) {
        return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
      }
      if (urlStr.includes('/api/related-systems')) {
        return Promise.resolve(new Response(JSON.stringify(mockSystems), { status: 200 }));
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('nav-create-ticket'));

    // Attempt to submit empty form
    const submitBtn = screen.getByTestId('submit-ticket-btn');
    await user.click(submitBtn);

    // Errors should appear directly below inputs
    expect(screen.getByTestId('error-summary')).toHaveTextContent(/summary is required/i);
    expect(screen.getByTestId('error-description')).toHaveTextContent(/description is required/i);
  });

  it('submits valid form, enters busy state, and displays official Ticket Number', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/categories')) {
        return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
      }
      if (urlStr.includes('/api/related-systems')) {
        return Promise.resolve(new Response(JSON.stringify(mockSystems), { status: 200 }));
      }
      if (urlStr.includes('/api/tickets') && init?.method === 'POST') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 105,
              ticketNumber: 'TKT-2026-000005',
              summary: 'Battery drains quickly',
              description: 'Laptop battery drains in 30 minutes without heavy usage.',
              status: 'NEW',
            }),
            { status: 201 }
          )
        );
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('nav-create-ticket'));

    // Fill Summary and Description
    const summaryInput = screen.getByTestId('ticket-summary-input');
    const descInput = screen.getByTestId('ticket-description-input');

    await user.type(summaryInput, 'Battery drains quickly');
    await user.type(descInput, 'Laptop battery drains in 30 minutes without heavy usage.');

    // Submit form
    const submitBtn = screen.getByTestId('submit-ticket-btn');
    await user.click(submitBtn);

    // Check success screen displays generated ticket number
    await waitFor(() => {
      expect(screen.getByText('Ticket Created Successfully')).toBeInTheDocument();
      expect(screen.getByTestId('generated-ticket-number')).toHaveTextContent('TKT-2026-000005');
    });
  });

  it('preserves form values when API submission fails with network error (BR-12)', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/categories')) {
        return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
      }
      if (urlStr.includes('/api/related-systems')) {
        return Promise.resolve(new Response(JSON.stringify(mockSystems), { status: 200 }));
      }
      if (urlStr.includes('/api/tickets') && init?.method === 'POST') {
        return Promise.reject(new Error('Server unavailable'));
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('nav-create-ticket'));

    const summaryInput = screen.getByTestId('ticket-summary-input');
    const descInput = screen.getByTestId('ticket-description-input');

    await user.type(summaryInput, 'Preserved summary text');
    await user.type(descInput, 'Preserved description content for network failure test.');

    const submitBtn = screen.getByTestId('submit-ticket-btn');
    await user.click(submitBtn);

    // Verify error banner shown and values preserved
    await waitFor(() => {
      expect(screen.getByTestId('create-ticket-server-error')).toBeInTheDocument();
    });

    expect(summaryInput).toHaveValue('Preserved summary text');
    expect(descInput).toHaveValue('Preserved description content for network failure test.');
  });
});
