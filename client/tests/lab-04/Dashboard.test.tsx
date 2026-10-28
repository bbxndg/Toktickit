import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from '../../src/pages/Dashboard';
let user = { id: 1, role: 'REQUESTER', isPasswordChangeRequired: false };
vi.mock('../../src/context/AuthContext', () => ({ useAuth: () => ({ user, token: 'token' }) }));
const requester = { generatedAt: '2026-10-28T00:00:00Z', window: { recentResolvedSince: '2026-10-21T00:00:00Z', recentResolvedUntil: '2026-10-28T00:00:00Z' },
  metrics: { totalTickets: 5, activeTickets: 2, waitingForRequester: 1, recentlyResolved: 0 }, recentTickets: [],
  drillDown: { totalTickets: { view: 'my-tickets', query: { page: 1 } }, activeTickets: { view: 'my-tickets', query: { statusGroup: 'active', page: 1 } },
    waitingForRequester: { view: 'my-tickets', query: { status: 'WAITING_FOR_REQUESTER', page: 1 } },
    recentlyResolved: { view: 'my-tickets', query: { status: 'RESOLVED', resolvedSince: '2026-10-21T00:00:00Z', resolvedUntil: '2026-10-28T00:00:00Z', page: 1 } } } };
const staff = { generatedAt: requester.generatedAt, metrics: { activeTickets: 2, unassignedTickets: 1, myAssignedTickets: 1, waitingForRequester: 0 },
  drillDown: { activeTickets: { view: 'ticket-queue', query: { statusGroup: 'active', page: 1 } }, unassignedTickets: { view: 'ticket-queue', query: { statusGroup: 'active', ownerId: 'unassigned', page: 1 } },
    myAssignedTickets: { view: 'ticket-queue', query: { statusGroup: 'active', ownerId: 2, page: 1 } }, waitingForRequester: { view: 'ticket-queue', query: { status: 'WAITING_FOR_REQUESTER', page: 1 } } },
  byStatus: { NEW: 1, RESOLVED: 0 }, byItPriority: { HIGH: 1, LOW: 0 }, recentTickets: [], myPendingActions: { totalItems: 8, data: [{ id: 99, ticketId: 10, ticketNumber: 'TKT-10', description: 'Check network', status: 'PLANNED', actionAt: requester.generatedAt, page: 2 }] } };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
beforeEach(() => { user = { id: 1, role: 'REQUESTER', isPasswordChangeRequired: false }; vi.stubGlobal('fetch', vi.fn(async () => response(requester))); });
describe('Dashboard', () => {
  it('shows requester counts and preserves the exact recent-resolution window in drill-down', async () => {
    const navigate = vi.fn(); render(<Dashboard onNavigate={navigate} onOpenTicket={vi.fn()} onCreateTicket={vi.fn()} />);
    expect(await screen.findByText('Recently Resolved (7 days)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View Recently Resolved (7 days)' }));
    expect(navigate).toHaveBeenCalledWith(requester.drillDown.recentlyResolved);
    expect(screen.getByText('No tickets yet.')).toBeInTheDocument();
  });
  it('renders staff buckets and opens the selected action on its actual page', async () => {
    user = { id: 2, role: 'IT_STAFF', isPasswordChangeRequired: false }; vi.mocked(fetch).mockResolvedValue(response(staff));
    const navigate = vi.fn(), open = vi.fn(); render(<Dashboard onNavigate={navigate} onOpenTicket={open} onCreateTicket={vi.fn()} />);
    expect(await screen.findByText('Showing 1 of 8 pending actions')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open Ticket TKT-10' })); expect(open).toHaveBeenCalledWith(10, { id: 99, page: 2 });
    await userEvent.click(screen.getByRole('button', { name: 'High: 1' }));
    expect(navigate).toHaveBeenCalledWith({ view: 'ticket-queue', query: { statusGroup: 'active', itPriority: 'HIGH', page: 1 } });
  });
  it('retains a successful snapshot and displays an error when refresh fails', async () => {
    const call = vi.mocked(fetch); call.mockResolvedValueOnce(response(requester)).mockResolvedValueOnce(response({}, 500)).mockResolvedValueOnce(response(requester));
    render(<Dashboard onNavigate={vi.fn()} onOpenTicket={vi.fn()} onCreateTicket={vi.fn()} />);
    expect(await screen.findByText('Total Tickets')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Showing previously loaded data'); expect(screen.getByText('Total Tickets')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' })); await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
  it('refreshes dashboard counts when returning from a Ticket', async () => {
    const changed = { ...requester, metrics: { ...requester.metrics, waitingForRequester: 0 } };
    vi.mocked(fetch).mockResolvedValueOnce(response(requester)).mockResolvedValueOnce(response(changed));
    const props = { onNavigate: vi.fn(), onOpenTicket: vi.fn(), onCreateTicket: vi.fn() };
    const rendered = render(<Dashboard {...props} active />);
    expect(await screen.findByText('Waiting for You')).toBeInTheDocument();
    rendered.rerender(<Dashboard {...props} active={false} />);
    rendered.rerender(<Dashboard {...props} active />);
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'View Waiting for Requester' }).parentElement).toHaveTextContent('0'));
  });
});
