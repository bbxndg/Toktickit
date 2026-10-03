import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StaffTicketQueue } from '../../src/pages/StaffTicketQueue';
import { AuthProvider } from '../../src/context/AuthContext';

describe('UI-03: IT Staff Ticket Queue Component Tests', () => {
  const staffUser = {
    id: 2,
    name: 'Alex Thompson',
    email: 'alex@toktickit.local',
    role: 'IT_STAFF',
    isActive: true,
    isPasswordChangeRequired: false,
  };

  const mockTickets = [
    {
      id: 101,
      ticketNumber: 'TKT-2026-000101',
      summary: 'VPN authentication failure in Europe branch',
      description: 'Users cannot log into global gateway.',
      requestedPriority: 'HIGH',
      itPriority: 'HIGH',
      status: 'OPEN',
      category: { id: 1, name: 'Network' },
      relatedSystem: { id: 1, name: 'VPN Gateway' },
      requester: { id: 10, name: 'John Doe', email: 'john@toktickit.local', department: 'Sales' },
      owner: null,
      createdAt: '2026-09-15T08:00:00.000Z',
      updatedAt: '2026-09-15T08:30:00.000Z',
      activeAttachmentsCount: 1,
    },
    {
      id: 102,
      ticketNumber: 'TKT-2026-000102',
      summary: 'Monitor screen flickering on laptop dock',
      description: 'Dock station hdmi port flickers when moved.',
      requestedPriority: 'MEDIUM',
      itPriority: 'MEDIUM',
      status: 'IN_PROGRESS',
      category: { id: 2, name: 'Hardware' },
      relatedSystem: { id: 2, name: 'Dell Dock' },
      requester: { id: 11, name: 'Jane Smith', email: 'jane@toktickit.local', department: 'Engineering' },
      owner: { id: 2, name: 'Alex Thompson', email: 'alex@toktickit.local' },
      createdAt: '2026-09-16T09:00:00.000Z',
      updatedAt: '2026-09-16T10:00:00.000Z',
      activeAttachmentsCount: 0,
    },
  ];

  const mockQueueCounts = {
    total: 2,
    unassigned: 1,
    open: 1,
    inProgress: 1,
    waitingForRequester: 0,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem('toktickit_auth_token', 'mock-staff-token');
    localStorage.setItem('toktickit_auth_user', JSON.stringify(staffUser));

    global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/auth/me')) {
        return Promise.resolve(new Response(JSON.stringify(staffUser), { status: 200 }));
      }
      if (urlStr.includes('/api/categories')) {
        return Promise.resolve(new Response(JSON.stringify([
          { id: 1, name: 'Network' },
          { id: 2, name: 'Hardware' },
        ]), { status: 200 }));
      }
      if (urlStr.includes('/api/staff/members')) {
        return Promise.resolve(new Response(JSON.stringify([staffUser]), { status: 200 }));
      }
      if (urlStr.includes('/api/staff/tickets')) {
        return Promise.resolve(new Response(JSON.stringify({
          data: mockTickets,
          pagination: { page: 1, pageSize: 10, totalItems: 2, totalPages: 1 },
          queueCounts: mockQueueCounts,
        }), { status: 200 }));
      }
      return Promise.reject(new Error(`Unknown endpoint: ${urlStr}`));
    });
  });

  it('renders staff ticket queue with summary chips, filter toolbar, and table', async () => {
    const onSelectTicket = vi.fn();

    render(
      <AuthProvider>
        <StaffTicketQueue onSelectTicket={onSelectTicket} />
      </AuthProvider>
    );

    expect(screen.getByText(/IT Staff Ticket Queue/i)).toBeInTheDocument();
    expect(screen.getByTestId('queue-summary-chips')).toBeInTheDocument();
    expect(screen.getByTestId('staff-queue-toolbar')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('staff-queue-table')).toBeInTheDocument();
    });

    expect(screen.getAllByText('TKT-2026-000101').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('TKT-2026-000102').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/VPN authentication failure/i).length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to ticket detail when ticket row or view button is clicked', async () => {
    const onSelectTicket = vi.fn();

    render(
      <AuthProvider>
        <StaffTicketQueue onSelectTicket={onSelectTicket} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('view-detail-btn-101')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-detail-btn-101'));
    expect(onSelectTicket).toHaveBeenCalledWith(101);
  });

  it('renders responsive mobile cards alongside desktop table in the DOM', async () => {
    const onSelectTicket = vi.fn();

    render(
      <AuthProvider>
        <StaffTicketQueue onSelectTicket={onSelectTicket} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('staff-queue-mobile-cards')).toBeInTheDocument();
    });

    expect(screen.getByTestId('staff-queue-card-101')).toBeInTheDocument();
    expect(screen.getByTestId('staff-queue-card-102')).toBeInTheDocument();
  });

  it('filters queue by keyword and triggers API search with debounce', async () => {
    const onSelectTicket = vi.fn();

    render(
      <AuthProvider>
        <StaffTicketQueue onSelectTicket={onSelectTicket} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('staff-queue-search')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('staff-queue-search');
    await userEvent.type(searchInput, 'VPN');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=VPN'),
        expect.any(Object)
      );
    });
  });
});
