import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

const mockRequester1 = {
  id: 1,
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@toktickit.local',
  department: 'Human Resources',
  isActive: true,
};

const mockRequester2 = {
  id: 2,
  name: 'Michael Brown',
  email: 'michael.brown@toktickit.local',
  department: 'Engineering',
  isActive: true,
};

const mockCategories = [
  { id: 1, name: 'Account and Access' },
  { id: 2, name: 'Hardware' },
  { id: 3, name: 'Software' },
];

const mockTicketsUser1 = [
  {
    id: 101,
    ticketNumber: 'TKT-2026-000001',
    summary: 'Laptop battery drains quickly',
    requestedPriority: 'MEDIUM',
    itPriority: 'MEDIUM',
    status: 'NEW',
    createdAt: '2026-09-04T10:00:00.000Z',
    updatedAt: '2026-09-04T10:00:00.000Z',
    category: { id: 2, name: 'Hardware' },
    relatedSystem: { id: 1, name: 'Corporate Laptop' },
    activeAttachmentsCount: 1,
  },
  {
    id: 102,
    ticketNumber: 'TKT-2026-000002',
    summary: 'VPN connection timeout',
    requestedPriority: 'HIGH',
    itPriority: 'HIGH',
    status: 'IN_PROGRESS',
    createdAt: '2026-09-04T11:00:00.000Z',
    updatedAt: '2026-09-04T11:30:00.000Z',
    category: { id: 1, name: 'Account and Access' },
    relatedSystem: { id: 4, name: 'VPN' },
    activeAttachmentsCount: 0,
  },
];

const mockTicketsUser2 = [
  {
    id: 103,
    ticketNumber: 'TKT-2026-000003',
    summary: 'LEB2 score upload error',
    requestedPriority: 'LOW',
    itPriority: 'LOW',
    status: 'RESOLVED',
    createdAt: '2026-09-04T12:00:00.000Z',
    updatedAt: '2026-09-04T14:00:00.000Z',
    category: { id: 3, name: 'Software' },
    relatedSystem: { id: 5, name: 'LEB2 App' },
    activeAttachmentsCount: 0,
  },
];

describe('My Tickets Screen (List Mode)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('toktickit_dev_requester', JSON.stringify(mockRequester1));
    vi.restoreAllMocks();
  });

  const setupFetchMock = (customTicketHandler?: (urlStr: string) => any) => {
    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlStr = url.toString();

      if (urlStr.includes('/api/categories')) {
        return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
      }
      if (urlStr.includes('/api/related-systems')) {
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      }
      if (urlStr.includes('/api/requesters')) {
        return Promise.resolve(
          new Response(JSON.stringify([mockRequester1, mockRequester2]), { status: 200 })
        );
      }
      if (urlStr.includes('/api/health')) {
        return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
      }

      if (urlStr.includes('/api/tickets')) {
        if (customTicketHandler) {
          const res = customTicketHandler(urlStr);
          return Promise.resolve(new Response(JSON.stringify(res), { status: 200 }));
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: mockTicketsUser1,
              pagination: { page: 1, pageSize: 8, totalItems: 2, totalPages: 1 },
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });
  };

  it('renders ticket table with tickets belonging to current requester', async () => {
    setupFetchMock();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'My Tickets' })).toBeInTheDocument();

    await waitFor(() => {
      const table = screen.getByTestId('tickets-table');
      expect(table).toBeInTheDocument();
      expect(within(table).getByText('TKT-2026-000001')).toBeInTheDocument();
      expect(within(table).getByText('Laptop battery drains quickly')).toBeInTheDocument();
      expect(within(table).getByText('TKT-2026-000002')).toBeInTheDocument();
      expect(within(table).getByText('VPN connection timeout')).toBeInTheDocument();
    });
  });

  it('UI-03: switching requester updates ticket list specifically for the new user', async () => {
    setupFetchMock((urlStr) => {
      if (urlStr.includes('requesterId=2')) {
        return {
          data: mockTicketsUser2,
          pagination: { page: 1, pageSize: 8, totalItems: 1, totalPages: 1 },
        };
      }
      return {
        data: mockTicketsUser1,
        pagination: { page: 1, pageSize: 8, totalItems: 2, totalPages: 1 },
      };
    });

    const user = userEvent.setup();
    render(<App />);

    // Initially displays User 1's tickets
    await waitFor(() => {
      const table = screen.getByTestId('tickets-table');
      expect(within(table).getByText('Laptop battery drains quickly')).toBeInTheDocument();
    });

    // Click Change Requester button in Navbar
    const changeBtn = screen.getByTestId('change-requester-btn');
    await user.click(changeBtn);

    // Modal opens, select User 2 (Michael Brown)
    await waitFor(() => {
      expect(screen.getByTestId('requester-dropdown')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId('requester-dropdown'), '2');
    await user.click(screen.getByTestId('selector-continue-btn'));

    // Now User 1's tickets should disappear and User 2's ticket should appear
    await waitFor(() => {
      const table = screen.getByTestId('tickets-table');
      expect(within(table).queryByText('Laptop battery drains quickly')).not.toBeInTheDocument();
      expect(within(table).getByText('LEB2 score upload error')).toBeInTheDocument();
      expect(within(table).getByText('TKT-2026-000003')).toBeInTheDocument();
    });
  });

  it('UI-04: pagination controls navigate pages and update table', async () => {
    setupFetchMock((urlStr) => {
      if (urlStr.includes('page=2')) {
        return {
          data: [mockTicketsUser1[1]],
          pagination: { page: 2, pageSize: 1, totalItems: 2, totalPages: 2 },
        };
      }
      return {
        data: [mockTicketsUser1[0]],
        pagination: { page: 1, pageSize: 1, totalItems: 2, totalPages: 2 },
      };
    });

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      const table = screen.getByTestId('tickets-table');
      expect(within(table).getByText('Laptop battery drains quickly')).toBeInTheDocument();
    });

    // Click next page button
    const nextBtn = screen.getByTestId('pagination-next');
    await user.click(nextBtn);

    await waitFor(() => {
      const table = screen.getByTestId('tickets-table');
      expect(within(table).getByText('VPN connection timeout')).toBeInTheDocument();
    });
  });

  it('renders empty state when user has 0 tickets', async () => {
    setupFetchMock(() => ({
      data: [],
      pagination: { page: 1, pageSize: 8, totalItems: 0, totalPages: 1 },
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText(/You have not submitted any IT support requests yet/i)).toBeInTheDocument();
      expect(screen.getByTestId('empty-create-ticket-btn')).toBeInTheDocument();
    });
  });

  it('renders no-results state when search/filter matches 0 tickets', async () => {
    setupFetchMock((urlStr) => {
      if (urlStr.includes('search=')) {
        return {
          data: [],
          pagination: { page: 1, pageSize: 8, totalItems: 0, totalPages: 1 },
        };
      }
      return {
        data: mockTicketsUser1,
        pagination: { page: 1, pageSize: 8, totalItems: 2, totalPages: 1 },
      };
    });

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      const table = screen.getByTestId('tickets-table');
      expect(within(table).getByText('Laptop battery drains quickly')).toBeInTheDocument();
    });

    // Type in search
    const searchInput = screen.getByTestId('search-input');
    await user.type(searchInput, 'nonexistentquery');

    await waitFor(() => {
      expect(screen.getByTestId('no-results-state')).toBeInTheDocument();
      expect(screen.getByText(/No tickets match your search or filter criteria/i)).toBeInTheDocument();
      expect(screen.getByTestId('no-results-clear-btn')).toBeInTheDocument();
    });
  });
});
