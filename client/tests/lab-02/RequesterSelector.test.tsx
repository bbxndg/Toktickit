import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

const mockRequesters = [
  {
    id: 1,
    name: 'Jennifer Anderson',
    email: 'jennifer.anderson@toktickit.local',
    department: 'Human Resources',
    isActive: true,
  },
  {
    id: 2,
    name: 'Michael Brown',
    email: 'michael.brown@toktickit.local',
    department: 'Engineering',
    isActive: true,
  },
];

describe('Development Requester Selection Workflow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders selector modal on initial load when no user is selected', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request) => {
      if (url.toString().includes('/api/requesters')) {
        return Promise.resolve(new Response(JSON.stringify(mockRequesters), { status: 200 }));
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    render(<App />);

    expect(
      screen.getByRole('heading', { level: 3, name: 'Select Development Requester' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Choose a development requester to simulate the current requester context/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('requester-dropdown')).toBeInTheDocument();
    });

    const dropdown = screen.getByTestId('requester-dropdown') as HTMLSelectElement;
    expect(dropdown.children.length).toBe(2);
    expect(screen.getByText(/Jennifer Anderson/)).toBeInTheDocument();
    expect(screen.getByText(/Michael Brown/)).toBeInTheDocument();
  });

  it('updates session context and displays requester in navbar when Continue is clicked', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request) => {
      if (url.toString().includes('/api/requesters')) {
        return Promise.resolve(new Response(JSON.stringify(mockRequesters), { status: 200 }));
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('requester-dropdown')).toBeInTheDocument();
    });

    // Select Michael Brown (id 2)
    const dropdown = screen.getByTestId('requester-dropdown');
    await user.selectOptions(dropdown, '2');

    // Click Continue
    const continueBtn = screen.getByTestId('selector-continue-btn');
    await user.click(continueBtn);

    // Modal should close and Navbar should display Michael Brown
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { level: 3, name: 'Select Development Requester' })
      ).not.toBeInTheDocument();
    });

    const badge = screen.getByTestId('user-identity-badge');
    expect(badge).toBeInTheDocument();
    expect(within(badge).getByText('Michael Brown')).toBeInTheDocument();
    expect(within(badge).getByText('Engineering')).toBeInTheDocument();
  });

  it('allows switching requester context via Change button in navbar', async () => {
    localStorage.setItem(
      'toktickit_dev_requester',
      JSON.stringify(mockRequesters[0])
    );

    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request) => {
      if (url.toString().includes('/api/requesters')) {
        return Promise.resolve(new Response(JSON.stringify(mockRequesters), { status: 200 }));
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const user = userEvent.setup();
    render(<App />);

    // Initially modal is closed, navbar displays Jennifer Anderson
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Select Development Requester' })
    ).not.toBeInTheDocument();
    const badge = screen.getByTestId('user-identity-badge');
    expect(within(badge).getByText('Jennifer Anderson')).toBeInTheDocument();

    // Click Change button
    const changeBtn = screen.getByTestId('change-requester-btn');
    await user.click(changeBtn);

    // Modal re-opens
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'Select Development Requester' })
      ).toBeInTheDocument();
    });
  });
});
