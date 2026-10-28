import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyTickets } from '../../src/pages/MyTickets';
import { StaffTicketQueue } from '../../src/pages/StaffTicketQueue';
vi.mock('../../src/context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token', user: { id: 4, role: 'IT_STAFF' } }) }));
vi.mock('../../src/context/RequesterContext', () => ({ useRequester: () => ({ currentRequester: { id: 7, name: 'Requester' } }) }));
const response = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
beforeEach(() => vi.stubGlobal('fetch', vi.fn(async (url: string) => {
  if (url.includes('/categories') || url.includes('/staff/members')) return response([]);
  return response({ data: [], pagination: { page: 1, pageSize: 8, totalItems: 0, totalPages: 1 } });
})));
describe('Dashboard list drill-down', () => {
  it('sends the exact requester resolution window with authentication and removes it on Clear Filters', async () => {
    render(<MyTickets onCreateTicket={() => {}} initialQuery={{ status: 'RESOLVED', resolvedSince: '2026-10-21T00:00:00.000Z', resolvedUntil: '2026-10-28T00:00:00.000Z', page: 1 }} />);
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('resolvedSince='))).toBe(true));
    const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes('resolvedSince='))!;
    const url = new URL(String(call[0])); expect(url.searchParams.get('status')).toBe('RESOLVED');
    expect(url.searchParams.get('resolvedSince')).toBe('2026-10-21T00:00:00.000Z');
    expect(url.searchParams.get('resolvedUntil')).toBe('2026-10-28T00:00:00.000Z');
    expect(call[1]?.headers).toMatchObject({ Authorization: 'Bearer test-token' });
    await userEvent.click(screen.getByTestId('clear-filters-btn'));
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([value]) => String(value).includes('/api/tickets?') && !String(value).includes('resolvedSince='))).toBe(true));
  });
  it('passes active and effective priority filters to staff queue and clears both', async () => {
    render(<StaffTicketQueue onSelectTicket={() => {}} initialQuery={{ statusGroup: 'active', itPriority: 'HIGH', page: 1 }} />);
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('statusGroup=active') && String(url).includes('itPriority=HIGH'))).toBe(true));
    expect(screen.getByText('Active Tickets')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^All / })).not.toHaveClass('btn-success');
    await userEvent.click(screen.getByTestId('staff-queue-clear-filters'));
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('/api/staff/tickets?') && !String(url).includes('statusGroup='))).toBe(true));
  });
  it.each(['requester', 'staff'] as const)('refreshes the %s list when returning to it and keeps the dashboard filter', async role => {
    const initialQuery = { statusGroup: 'active' };
    const view = role === 'requester'
      ? (active: boolean) => <MyTickets active={active} onCreateTicket={() => {}} initialQuery={initialQuery} />
      : (active: boolean) => <StaffTicketQueue active={active} onSelectTicket={() => {}} initialQuery={initialQuery} />;
    const rendered = render(view(true));
    const path = role === 'requester' ? '/api/tickets?' : '/api/staff/tickets?';
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes(path))).toHaveLength(1));
    rendered.rerender(view(false));
    rendered.rerender(view(true));
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes(path))).toHaveLength(2));
    const calls = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes(path));
    expect(new URL(String(calls[1][0])).searchParams.get('statusGroup')).toBe('active');
    expect(new URL(String(calls[1][0])).searchParams.get('page')).toBe('1');
  });
  it.each(['requester', 'staff'] as const)('ignores an older %s list response after a newer filter is selected', async role => {
    let finishOld!: (value: Response) => void;
    const old = new Promise<Response>(resolve => { finishOld = resolve; });
    const item = (summary: string) => ({ id: summary === 'Old result' ? 1 : 2, ticketNumber: summary === 'Old result' ? 'OLD' : 'NEW', summary,
      status: 'OPEN', requestedPriority: 'HIGH', itPriority: 'HIGH', createdAt: '2026-10-29T00:00:00Z', updatedAt: '2026-10-29T00:00:00Z',
      category: { id: 1, name: 'Network' }, relatedSystem: { id: 1, name: 'Wi-Fi' }, requester: { id: 7, name: 'Requester' }, owner: null, activeAttachmentsCount: 0 });
    const page = (summary: string) => response({ data: [item(summary)], pagination: { page: 1, pageSize: 8, totalItems: 1, totalPages: 1 } });
    vi.mocked(fetch).mockImplementation(async (url: string) => {
      if (url.includes('/categories') || url.includes('/staff/members')) return response([]);
      return new URL(url).searchParams.get('status') === 'OPEN' ? page('New result') : old;
    });
    render(role === 'requester' ? <MyTickets onCreateTicket={() => {}} /> : <StaffTicketQueue onSelectTicket={() => {}} />);
    const filter = await screen.findByTestId(role === 'requester' ? 'status-filter' : 'staff-queue-status-filter');
    await userEvent.selectOptions(filter, 'OPEN');
    expect((await screen.findAllByText('New result')).length).toBeGreaterThan(0);
    await act(async () => { finishOld(page('Old result')); await old; });
    expect(screen.queryByText('Old result')).not.toBeInTheDocument();
    expect(screen.getAllByText('New result').length).toBeGreaterThan(0);
  });
  it.each(['requester', 'staff'] as const)('returns to the last available %s page when the current page disappears', async role => {
    let removed = false;
    const row = (name: string) => ({ id: name === 'Remaining ticket' ? 1 : 2, ticketNumber: name === 'Remaining ticket' ? 'KEEP' : 'CHANGE', summary: name,
      status: 'WAITING_FOR_REQUESTER', requestedPriority: 'HIGH', itPriority: 'HIGH', createdAt: '2026-10-29T00:00:00Z', updatedAt: '2026-10-29T00:00:00Z',
      category: { id: 1, name: 'Network' }, relatedSystem: { id: 1, name: 'Wi-Fi' }, requester: { id: 7, name: 'Requester' }, owner: null, activeAttachmentsCount: 0 });
    vi.mocked(fetch).mockImplementation(async (url: string) => {
      if (url.includes('/categories') || url.includes('/staff/members')) return response([]);
      const page = Number(new URL(url).searchParams.get('page'));
      const result = page === 2 ? (removed ? [] : [row('Changed ticket')]) : [row('Remaining ticket')];
      return response({ data: result, pagination: { page, pageSize: 1, totalItems: removed ? 1 : 2, totalPages: removed ? 1 : 2 } });
    });
    const query = { status: 'WAITING_FOR_REQUESTER' };
    const view = role === 'requester'
      ? (active: boolean) => <MyTickets active={active} onCreateTicket={() => {}} initialQuery={query} />
      : (active: boolean) => <StaffTicketQueue active={active} onSelectTicket={() => {}} initialQuery={query} />;
    const rendered = render(view(true));
    await screen.findAllByText('Remaining ticket');
    await userEvent.click(screen.getByTestId(role === 'requester' ? 'pagination-next' : 'staff-queue-pagination-next'));
    await screen.findAllByText('Changed ticket');
    rendered.rerender(view(false)); removed = true; rendered.rerender(view(true));
    expect((await screen.findAllByText('Remaining ticket')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Changed ticket')).not.toBeInTheDocument();
    const listCalls = vi.mocked(fetch).mock.calls.map(([url]) => String(url)).filter(url => url.includes(role === 'requester' ? '/api/tickets?' : '/api/staff/tickets?'));
    expect(new URL(listCalls.at(-1)!).searchParams.get('page')).toBe('1');
    expect(new URL(listCalls.at(-1)!).searchParams.get('status')).toBe('WAITING_FOR_REQUESTER');
  });
});
