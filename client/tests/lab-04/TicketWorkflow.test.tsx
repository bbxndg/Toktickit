import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffTicketDetail } from '../../src/pages/StaffTicketDetail';
import { TicketDetail } from '../../src/pages/TicketDetail';
import { StatusHistory } from '../../src/components/tickets/StatusHistory';

let actor = { id: 8, name: 'IT Staff', role: 'IT_STAFF' };
vi.mock('../../src/context/AuthContext', () => ({ useAuth: () => ({ token: 'workflow-token', user: actor }) }));
vi.mock('../../src/context/RequesterContext', () => ({ useRequester: () => ({ currentRequester: { id: 9 } }) }));
const initial = { id: 105, ticketNumber: 'TKT-WORKFLOW', version: 4, status: 'IN_PROGRESS', summary: 'Shared workflow test', description: 'Check support work',
  requestedPriority: 'HIGH', itPriority: 'HIGH', requesterId: 9, requester: { id: 9, name: 'Requester', email: 'qa@test.local' },
  ownerId: 8 as number | null, owner: { id: 8, name: 'IT Staff' } as { id: number; name: string } | null, category: { id: 1, name: 'Network' }, relatedSystem: { id: 1, name: 'Wi-Fi' },
  createdAt: '2026-10-28T00:00:00Z', updatedAt: '2026-10-28T00:00:00Z', attachments: [], activeAttachmentsCount: 0,
  allowedStatusTransitions: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'], resolutionGate: { blocked: false, pendingActionCount: 0 },
  requesterResolvedIndication: false, requesterResolvedAt: null as string | null, resolutionSummary: null as string | null };
let ticket = { ...initial };
let conflict: boolean;
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
beforeEach(() => {
  actor = { id: 8, name: 'IT Staff', role: 'IT_STAFF' }; ticket = structuredClone(initial); conflict = false;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/status-history')) return json({ data: [], pagination: { page: 1, totalPages: 1, totalItems: 0 } });
    if (url.includes('/actions-taken')) return json({ data: [], ticket, pagination: { page: 1, totalPages: 1, totalItems: 0 } });
    if (url.includes('/comments') || url.includes('/internal-notes')) return json([]);
    if (url.includes('/staff/members')) return json([actor]);
    if (init?.method === 'PATCH') {
      if (conflict) { conflict = false; ticket.version = 5; return json({ error: { code: 'STALE_UPDATE', message: 'Changed by another staff member' } }, 409); }
      const body = JSON.parse(init.body as string);
      if (url.includes('/indicate-resolved')) ticket = { ...ticket, requesterResolvedIndication: true, requesterResolvedAt: '2026-10-28T01:00:00Z', version: ticket.version + 1 };
      else ticket = { ...ticket, status: body.status, resolutionSummary: body.resolutionSummary || null, version: ticket.version + 1,
        allowedStatusTransitions: body.status === 'RESOLVED' ? ['CLOSED', 'REOPENED'] : [] };
      return json(ticket);
    }
    return json(ticket);
  }));
});
describe('Ticket workflow UI (UI-02)', () => {
  it.each(['claim', 'assign'])('refreshes permitted transitions after %s advances NEW to OPEN', async operation => {
    ticket.status = 'NEW'; ticket.ownerId = null; ticket.owner = null; ticket.allowedStatusTransitions = ['OPEN', 'IN_PROGRESS', 'CANCELLED'];
    const original = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith(`/${operation}`) && init?.method === 'PATCH') {
        ticket = { ...ticket, ownerId: 8, owner: { id: 8, name: 'IT Staff' }, status: 'OPEN', version: 5,
          allowedStatusTransitions: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'] };
        return json({ id: ticket.id, ownerId: 8, owner: ticket.owner, status: 'OPEN', version: 5 });
      }
      return original(url, init);
    });
    render(<StaffTicketDetail ticketId={105} onBack={() => {}} />);
    await screen.findByTestId('status-transition-select');
    if (operation === 'claim') await userEvent.click(screen.getByTestId('claim-ticket-btn'));
    else await userEvent.selectOptions(screen.getByTestId('assign-owner-select'), '8');
    await waitFor(() => expect(within(screen.getByTestId('status-transition-select')).getByRole('option', { name: '➔ RESOLVED' })).toBeEnabled());
    expect(within(screen.getByTestId('status-transition-select')).getByRole('option', { name: '➔ WAITING FOR REQUESTER' })).toBeInTheDocument();
    expect(within(screen.getByTestId('status-transition-select')).queryByRole('option', { name: '➔ OPEN' })).not.toBeInTheDocument();
  });
  it('blocks further writes after a successful transition whose detail refresh fails, then recovers through explicit reload', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!;
    let failRefresh = false;
    vi.mocked(fetch).mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        ticket = { ...ticket, status: 'RESOLVED', version: 5, resolutionSummary: 'Verified service', allowedStatusTransitions: ['CLOSED', 'REOPENED'] };
        failRefresh = true;
        return json({ id: ticket.id, status: ticket.status, version: 5, resolutionSummary: ticket.resolutionSummary });
      }
      if (url.endsWith('/staff/tickets/105') && failRefresh) return json({ error: { message: 'Unavailable' } }, 500);
      return original(url, init);
    });
    render(<StaffTicketDetail ticketId={105} onBack={() => {}} />);
    await userEvent.selectOptions(await screen.findByTestId('status-transition-select'), 'RESOLVED');
    await userEvent.type(screen.getByLabelText(/Resolution Summary/), 'Verified service');
    await userEvent.click(screen.getByTestId('confirm-terminal-btn'));
    expect(await screen.findByRole('button', { name: 'Reload Latest Ticket' })).toBeInTheDocument();
    expect(screen.getByTestId('status-transition-select')).toBeDisabled();
    expect(screen.getByTestId('assign-owner-select')).toBeDisabled();
    expect(screen.getByTestId('it-priority-select')).toBeDisabled();
    expect(screen.getByText(/Failed to load ticket \(500\)/)).toBeInTheDocument();
    failRefresh = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reload Latest Ticket' }));
    await waitFor(() => expect(screen.getByTestId('status-transition-select')).toBeEnabled());
    expect(within(screen.getByTestId('status-transition-select')).getByRole('option', { name: '➔ REOPENED' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload Latest Ticket' })).not.toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(1);
  });
  it('explains resolution blockers and links to Actions Taken instead of offering an enabled Resolve option', async () => {
    ticket.resolutionGate = { blocked: true, pendingActionCount: 2 };
    render(<StaffTicketDetail ticketId={105} onBack={() => {}} />);
    const select = await screen.findByTestId('status-transition-select');
    expect(within(select).getByRole('option', { name: /RESOLVED/ })).toBeDisabled();
    expect(screen.getByText('Complete or cancel pending actions before resolving this ticket.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View 2 pending actions' }));
    expect(await screen.findByRole('region', { name: 'Actions Taken' })).toBeInTheDocument();
  });
  it('requires a shared summary, retains it after 409 and sends the reviewed draft with the refreshed version', async () => {
    const user = userEvent.setup(); render(<StaffTicketDetail ticketId={105} onBack={() => {}} />);
    await user.selectOptions(await screen.findByTestId('status-transition-select'), 'RESOLVED');
    await user.click(screen.getByTestId('confirm-terminal-btn'));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter 2 to 2,000 characters.');
    const summary = screen.getByLabelText(/Resolution Summary/);
    expect(summary).toHaveFocus(); await user.type(summary, 'Verified with the Requester');
    conflict = true; await user.click(screen.getByTestId('confirm-terminal-btn'));
    const dialog = screen.getByRole('dialog');
    await user.click(await within(dialog).findByRole('button', { name: 'Reload Latest Ticket' }));
    await waitFor(() => expect(screen.getByTestId('confirm-terminal-btn')).toBeEnabled());
    expect(summary).toHaveValue('Verified with the Requester');
    await user.click(screen.getByTestId('confirm-terminal-btn'));
    await waitFor(() => expect(screen.queryByTestId('terminal-status-modal')).not.toBeInTheDocument());
    const saves = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(saves.at(-1)![1]!.body as string)).toMatchObject({ status: 'RESOLVED', version: 5, resolutionSummary: 'Verified with the Requester' });
    expect(screen.getByText('Verified with the Requester')).toBeInTheDocument();
  });
  it('explains cancellation cascade and requires a reason', async () => {
    const user = userEvent.setup(); render(<StaffTicketDetail ticketId={105} onBack={() => {}} />);
    await user.selectOptions(await screen.findByTestId('status-transition-select'), 'CANCELLED');
    expect(screen.getByText(/Pending actions will be cancelled together/)).toBeInTheDocument();
    await user.click(screen.getByTestId('confirm-terminal-btn'));
    expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
    await user.type(screen.getByLabelText(/Cancellation Reason/), 'Request no longer needed');
    await user.click(screen.getByTestId('confirm-terminal-btn'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('assign-owner-select')).toBeDisabled();
    expect(screen.getByTestId('it-priority-select')).toBeDisabled();
  });
  it('sends advisory indication and keeps Requester status unchanged while removing the repeat control', async () => {
    actor = { id: 9, name: 'Requester', role: 'REQUESTER' };
    const user = userEvent.setup(); render(<TicketDetail ticketId={105} onBack={() => {}} />);
    await user.click(await screen.findByTestId('indicate-resolved-btn'));
    expect(screen.getByRole('dialog')).toHaveTextContent('IT will review the work before updating the ticket status.');
    await user.click(screen.getByTestId('confirm-resolve-btn'));
    await waitFor(() => expect(screen.queryByTestId('indicate-resolved-btn')).not.toBeInTheDocument());
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Sent to IT for review.');
    expect(ticket.status).toBe('IN_PROGRESS'); expect(ticket.version).toBe(5);
  });
  it('shows shared requester indication to staff and exposes read-only history', async () => {
    ticket.requesterResolvedIndication = true; ticket.requesterResolvedAt = '2026-10-28T01:00:00Z';
    render(<StaffTicketDetail ticketId={105} onBack={() => {}} />);
    expect(await screen.findByText(/Requester reports that the problem appears resolved/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Status History' }));
    expect(await screen.findByText('No recorded status changes.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit History|Delete History/ })).not.toBeInTheDocument();
  });
  it.each(['RESOLVED', 'CLOSED', 'CANCELLED'])('retains the indication timestamp without claiming pending review after %s', async (status) => {
    ticket.status = status; ticket.allowedStatusTransitions = [];
    ticket.requesterResolvedIndication = true; ticket.requesterResolvedAt = '2026-10-28T01:00:00Z';
    const staff = render(<StaffTicketDetail ticketId={105} onBack={() => {}} />);
    expect(await screen.findByText(/Requester reports that the problem appears resolved/)).toBeInTheDocument();
    expect(screen.getByRole('status')).not.toHaveTextContent('IT review is still required');
    staff.unmount(); actor = { id: 9, name: 'Requester', role: 'REQUESTER' };
    render(<TicketDetail ticketId={105} onBack={() => {}} />);
    expect(await screen.findByText(/Sent to IT for review/)).toBeInTheDocument();
    expect(screen.getByRole('status')).not.toHaveTextContent('IT will review the work');
    expect(screen.getByRole('status')).toHaveTextContent('2026');
  });
  it('preserves read-only history content as inert text and supports failure retry and pagination', async () => {
    let failed = true;
    vi.mocked(fetch).mockImplementation(async (url: string) => {
      if (failed) { failed = false; return json({ error: { message: 'History unavailable' } }, 500); }
      const page = url.includes('page=2') ? 2 : 1;
      return json({ data: [{ id: page, fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', actor: { id: 8, name: 'IT Staff', role: 'IT_STAFF' }, createdAt: initial.createdAt,
        reason: page === 1 ? '<script>shared reason</script>' : 'Second history page' }], pagination: { page, totalPages: 2, totalItems: 21 } });
    });
    render(<StatusHistory ticketId={105} token="workflow-token" version={4} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('History unavailable');
    expect(screen.queryByText('No recorded status changes.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry History' }));
    expect(await screen.findByText('<script>shared reason</script>')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Second history page')).toBeInTheDocument();
  });
});
