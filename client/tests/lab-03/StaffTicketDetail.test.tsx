import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StaffTicketDetail } from '../../src/pages/StaffTicketDetail';
import { AuthProvider } from '../../src/context/AuthContext';

describe('UI-04: IT Staff Ticket Detail & Operational Controls Component Tests', () => {
  const staffUser = {
    id: 2,
    name: 'Alex Thompson',
    email: 'alex@toktickit.local',
    role: 'IT_STAFF',
    isActive: true,
    isPasswordChangeRequired: false,
  };

  const otherStaff = {
    id: 3,
    name: 'Sarah Connor',
    email: 'sarah@toktickit.local',
    role: 'IT_STAFF',
  };

  const mockTicket = {
    id: 101,
    ticketNumber: 'TKT-2026-000101',
    summary: 'Core switch uplink flap',
    description: 'Switch port 24 on core switch drops packet periodically.',
    requestedPriority: 'HIGH',
    itPriority: 'HIGH',
    status: 'NEW',
    categoryId: 1,
    category: { id: 1, name: 'Network' },
    relatedSystemId: 1,
    relatedSystem: { id: 1, name: 'Core Network Switch' },
    requesterId: 10,
    requester: { id: 10, name: 'John Doe', email: 'john@toktickit.local', department: 'Operations' },
    ownerId: null,
    owner: null,
    createdAt: '2026-09-15T08:00:00.000Z',
    updatedAt: '2026-09-15T08:30:00.000Z',
    attachments: [
      {
        id: 1,
        originalName: 'switch_logs.txt',
        mimeType: 'text/plain',
        sizeBytes: 1024,
        isRemoved: false,
        removedAt: null,
        removalReason: null,
        createdAt: '2026-09-15T08:00:00.000Z',
      },
    ],
    activeAttachmentsCount: 1,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem('toktickit_auth_token', 'mock-staff-token');
    localStorage.setItem('toktickit_auth_user', JSON.stringify(staffUser));

    global.fetch = vi.fn().mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/auth/me')) {
        return Promise.resolve(new Response(JSON.stringify(staffUser), { status: 200 }));
      }
      if (urlStr.includes('/api/staff/members')) {
        return Promise.resolve(new Response(JSON.stringify([staffUser, otherStaff]), { status: 200 }));
      }
      if (urlStr.includes('/api/staff/tickets/101/claim') && init?.method === 'PATCH') {
        return Promise.resolve(new Response(JSON.stringify({
          id: 101,
          ticketNumber: 'TKT-2026-000101',
          ownerId: staffUser.id,
          owner: staffUser,
          status: 'OPEN',
        }), { status: 200 }));
      }
      if (urlStr.includes('/api/staff/tickets/101/priority') && init?.method === 'PATCH') {
        const body = JSON.parse(init.body as string);
        return Promise.resolve(new Response(JSON.stringify({
          id: 101,
          ticketNumber: 'TKT-2026-000101',
          itPriority: body.itPriority,
        }), { status: 200 }));
      }
      if (urlStr.includes('/api/staff/tickets/101/status') && init?.method === 'PATCH') {
        const body = JSON.parse(init.body as string);
        return Promise.resolve(new Response(JSON.stringify({
          id: 101,
          ticketNumber: 'TKT-2026-000101',
          status: body.status,
        }), { status: 200 }));
      }
      if (urlStr.includes('/api/staff/tickets/101')) {
        return Promise.resolve(new Response(JSON.stringify(mockTicket), { status: 200 }));
      }
      return Promise.reject(new Error(`Unknown endpoint: ${urlStr}`));
    });
  });

  it('renders operational action strip with claim button, priority, and status dropdowns', async () => {
    const onBack = vi.fn();

    render(
      <AuthProvider>
        <StaffTicketDetail ticketId={101} onBack={onBack} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('staff-operational-strip')).toBeInTheDocument();
      expect(screen.getByTestId('claim-ticket-btn')).toBeInTheDocument();
      expect(screen.getByTestId('assign-owner-select')).toBeInTheDocument();
      expect(screen.getByTestId('it-priority-select')).toBeInTheDocument();
      expect(screen.getByTestId('status-transition-select')).toBeInTheDocument();
    });

    expect(screen.getAllByText('TKT-2026-000101').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Core switch uplink flap/i)).toBeInTheDocument();
  });

  it('claims unassigned ticket and updates owner badge and status', async () => {
    const onBack = vi.fn();

    render(
      <AuthProvider>
        <StaffTicketDetail ticketId={101} onBack={onBack} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('claim-ticket-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('claim-ticket-btn'));

    await waitFor(() => {
      expect(screen.getByText(/You claimed ticket #TKT-2026-000101/i)).toBeInTheDocument();
    });
  });

  it('updates IT priority when selecting new priority option', async () => {
    const onBack = vi.fn();

    render(
      <AuthProvider>
        <StaffTicketDetail ticketId={101} onBack={onBack} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('it-priority-select')).toBeInTheDocument();
    });

    await userEvent.selectOptions(screen.getByTestId('it-priority-select'), 'CRITICAL');

    await waitFor(() => {
      expect(screen.getByText(/IT Priority updated to CRITICAL/i)).toBeInTheDocument();
    });
  });

  it('prompts confirmation modal before transitioning to terminal status (RESOLVED/CLOSED)', async () => {
    const onBack = vi.fn();

    render(
      <AuthProvider>
        <StaffTicketDetail ticketId={101} onBack={onBack} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status-transition-select')).toBeInTheDocument();
    });

    // In mockTicket status is NEW, permitted transitions: OPEN, IN_PROGRESS, CANCELLED
    // Select CANCELLED (which is a terminal state)
    await userEvent.selectOptions(screen.getByTestId('status-transition-select'), 'CANCELLED');

    // Terminal confirmation modal should appear
    await waitFor(() => {
      expect(screen.getByTestId('terminal-status-modal')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-terminal-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('confirm-terminal-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('terminal-status-modal')).not.toBeInTheDocument();
      expect(screen.getByText(/Ticket status updated to CANCELLED/i)).toBeInTheDocument();
    });
  });
});
