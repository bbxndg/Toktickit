import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionsTaken } from '../../src/components/tickets/ActionsTaken';

const user = { id: 8, name: 'Alex', role: 'IT_STAFF' as const };
const parent = { id: 105, status: 'OPEN', version: 4, updatedAt: '2026-10-14T00:00:00Z' };
const action = { id: 301, ticketId: 105, description: '<script>shared text</script>', status: 'PLANNED',
  assignee: user, createdBy: user, updatedBy: user, performedBy: null, followUpRequired: false, followUpNote: null,
  result: null, attachmentNotes: null, cancelReason: null, version: 1, actionAt: parent.updatedAt, createdAt: parent.updatedAt, updatedAt: parent.updatedAt };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
let onTicketChange: ReturnType<typeof vi.fn>;
function mount(role: 'IT_STAFF' | 'REQUESTER' = 'IT_STAFF', status = 'OPEN') {
  return render(<ActionsTaken ticketId={105} token="test-token" currentUser={{ ...user, role }}
    ticketStatus={status} ticketVersion={4} onTicketChange={onTicketChange} />);
}
beforeEach(() => {
  vi.restoreAllMocks(); onTicketChange = vi.fn();
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/staff/members')) return response([user]);
    if (init?.method === 'POST') return response({ data: action, ticket: { ...parent, version: 5 }, replayed: false }, 201);
    return response({ data: [action], ticket: parent, pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
  }));
});

describe('Lab 4 Actions Taken UI (UI-01, UI-05, UI-06)', () => {
  it('opens the requested action page and identifies only the selected action', async () => {
    vi.mocked(fetch).mockImplementation(async (url: string) => response({ data: [action, { ...action, id: 302, description: 'Another action' }], ticket: parent,
      pagination: { page: 2, pageSize: 20, totalItems: 22, totalPages: 2 } }));
    render(<ActionsTaken ticketId={105} token="test-token" currentUser={user} ticketStatus="OPEN" ticketVersion={4}
      onTicketChange={onTicketChange} actionTarget={{ id: 302, page: 2 }} />);
    expect(await screen.findAllByText('Another action')).toHaveLength(2);
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('page=2'))).toBe(true);
    const rows = screen.getAllByRole('row');
    expect(rows.find(row => row.textContent?.includes('Another action'))).toHaveTextContent('(Selected)');
    expect(rows.find(row => row.textContent?.includes(action.description))).not.toHaveTextContent('(Selected)');
  });
  it('renders inert shared records and gives the Requester no write controls', async () => {
    mount('REQUESTER');
    expect((await screen.findAllByText(action.description)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Add Action' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0]);
    expect(screen.getByRole('dialog', { name: 'View Action' })).toHaveTextContent('Not completed');
    expect(screen.queryByText('Internal Notes')).not.toBeInTheDocument();
  });
  it.each(['IT_STAFF', 'REQUESTER'] as const)('labels a historical inactive assignee in the %s list and View', async role => {
    vi.mocked(fetch).mockResolvedValue(response({ data: [{ ...action, assignee: { ...user, name: 'Historical Staff', isActive: false } }],
      ticket: parent, pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } }));
    mount(role);
    expect(await screen.findByText('Historical Staff (Inactive)', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByText(/Assignee: Historical Staff \(Inactive\)/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0]);
    expect(screen.getByRole('dialog', { name: 'View Action' })).toHaveTextContent('Historical Staff (Inactive)');
  });
  it('validates follow-up and completion fields before submitting', async () => {
    const actor = userEvent.setup(); mount();
    await actor.click(await screen.findByRole('button', { name: 'Add Action' }));
    await actor.type(screen.getByLabelText(/Action Description/), 'Investigate Wi-Fi');
    await actor.click(screen.getByLabelText('Follow-Up Required?'));
    await actor.click(screen.getByRole('button', { name: 'Save Action' }));
    expect(await screen.findByText('Enter 2 to 2,000 characters.', { selector: '[role="alert"]' })).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
    await actor.type(screen.getByLabelText(/Follow-up Note/), 'Check after restart');
    await actor.click(screen.getByRole('button', { name: 'Save Action' }));
    await waitFor(() => expect(onTicketChange).toHaveBeenCalledWith(expect.objectContaining({ version: 5 })));
    const call = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(call[1]!.body as string)).toMatchObject({ ticketVersion: 4, assigneeId: 8, followUpRequired: true });
  });
  it('preserves a failed create and reuses the same key/payload after a lost response', async () => {
    let attempts = 0; const bodies: string[] = [];
    const original = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (init?.method === 'POST') {
        bodies.push(init.body as string);
        if (++attempts === 1) throw new TypeError('Network error');
      }
      return original(url, init);
    });
    const actor = userEvent.setup(); mount();
    await actor.click(await screen.findByRole('button', { name: 'Add Action' }));
    await actor.type(screen.getByLabelText(/Action Description/), 'Inspect adapter');
    await actor.click(screen.getByRole('button', { name: 'Save Action' }));
    expect(await screen.findByRole('button', { name: 'Retry Previous Save' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Action Description/)).toHaveValue('Inspect adapter');
    await actor.click(screen.getByRole('button', { name: 'Retry Previous Save' }));
    await waitFor(() => expect(bodies).toHaveLength(2)); expect(bodies[0]).toBe(bodies[1]);
  });
  it('keeps the draft after stale conflict and explicitly reloads versions before another save', async () => {
    let stale = true; const original = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (init?.method === 'PATCH' && stale) { stale = false; return response({ error: { code: 'STALE_UPDATE', message: 'Changed by another staff member' } }, 409); }
      if (init?.method === 'PATCH') return response({ data: { ...action, version: 3 }, ticket: { ...parent, version: 7 } });
      if (!stale && url.toString().includes('/actions-taken')) return response({ data: [{ ...action, version: 2 }], ticket: { ...parent, version: 6 }, pagination: { page: 1, totalPages: 1, totalItems: 1 } });
      return original(url, init);
    });
    const actor = userEvent.setup(); mount();
    await screen.findAllByText(action.description);
    await actor.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const field = screen.getByLabelText(/Action Description/); await actor.clear(field); await actor.type(field, 'Keep this draft');
    await actor.click(screen.getByRole('button', { name: 'Save Changes' }));
    await actor.click(await screen.findByRole('button', { name: 'Reload Latest' }));
    expect(field).toHaveValue('Keep this draft');
    await actor.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(onTicketChange).toHaveBeenCalledWith(expect.objectContaining({ version: 7 })));
    const calls = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(calls.at(-1)![1]!.body as string)).toMatchObject({ version: 2, ticketVersion: 6, description: 'Keep this draft' });
  });
  it.each(['PLANNED', 'COMPLETED', 'CANCELLED'] as const)('reconciles a %s draft after another user advances the action', async draftStatus => {
    let stale = true;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (url.toString().includes('/staff/members')) return response([user]);
      if (init?.method === 'PATCH') {
        if (stale) { stale = false; return response({ error: { code: 'STALE_UPDATE', message: 'Changed by another staff member' } }, 409); }
        return response({ data: { ...action, ...JSON.parse(init.body as string), version: 3 }, ticket: { ...parent, version: 7 } });
      }
      return response({ data: [{ ...action, status: stale ? 'PLANNED' : 'IN_PROGRESS', version: stale ? 1 : 2 }],
        ticket: { ...parent, version: stale ? 4 : 6 }, pagination: { page: 1, totalPages: 1, totalItems: 1 } });
    });
    const actor = userEvent.setup(); mount();
    await actor.click((await screen.findAllByRole('button', { name: 'Edit' }))[0]);
    await actor.clear(screen.getByLabelText(/Action Description/));
    await actor.type(screen.getByLabelText(/Action Description/), 'Keep my investigation notes');
    await actor.type(screen.getByLabelText(/Attachment Notes/), 'Keep supporting evidence');
    await actor.selectOptions(screen.getByLabelText('Status'), draftStatus);
    if (draftStatus === 'COMPLETED') await actor.type(screen.getByLabelText(/Result/), 'Connection restored');
    if (draftStatus === 'CANCELLED') await actor.type(screen.getByLabelText(/Cancellation Reason/), 'Work is no longer required');
    await actor.click(screen.getByRole('button', { name: 'Save Changes' }));
    if (draftStatus !== 'PLANNED') await actor.click(screen.getByRole('button', { name: draftStatus === 'COMPLETED' ? 'Confirm Completion' : 'Confirm Cancellation' }));
    await actor.click(await screen.findByRole('button', { name: 'Reload Latest' }));

    const expectedStatus = draftStatus === 'PLANNED' ? 'IN_PROGRESS' : draftStatus;
    expect(screen.getByLabelText('Status')).toHaveValue(expectedStatus);
    expect(screen.getByLabelText(/Action Description/)).toHaveValue('Keep my investigation notes');
    expect(screen.getByLabelText(/Attachment Notes/)).toHaveValue('Keep supporting evidence');
    const dialog = screen.getByRole('dialog');
    if (draftStatus === 'PLANNED') expect(within(dialog).getByRole('status')).toHaveTextContent(/status.*Planned.*In Progress.*review/i);
    else expect(within(dialog).queryByRole('status')).not.toBeInTheDocument();
    // Reload must not save automatically; terminal drafts still need explicit confirmation.
    expect(vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(1);
    await actor.click(screen.getByRole('button', { name: 'Save Changes' }));
    if (draftStatus !== 'PLANNED') {
      expect(vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(1);
      await actor.click(screen.getByRole('button', { name: draftStatus === 'COMPLETED' ? 'Confirm Completion' : 'Confirm Cancellation' }));
    }
    await waitFor(() => expect(onTicketChange).toHaveBeenCalledWith(expect.objectContaining({ version: 7 })));
    const calls = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(calls.at(-1)![1]!.body as string)).toMatchObject({ version: 2, ticketVersion: 6,
      status: expectedStatus, description: 'Keep my investigation notes', attachmentNotes: 'Keep supporting evidence' });
  });
  it.each(['COMPLETED', 'CANCELLED'])('requires explicit %s confirmation and traps keyboard focus', async status => {
    const actor = userEvent.setup(); mount(); await screen.findAllByText(action.description);
    await actor.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    await actor.selectOptions(screen.getByLabelText('Status'), status);
    const fieldName = status === 'COMPLETED' ? /Result/ : /Cancellation Reason/;
    await actor.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter 2 to 2,000 characters.');
    await actor.type(screen.getByLabelText(fieldName), 'Connection restored');
    await actor.click(screen.getByRole('button', { name: 'Save Changes' }));
    const dialog = screen.getByRole('dialog'); expect(dialog).toHaveTextContent('This action will become read-only.');
    expect(vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(0);
    expect(within(dialog).getByRole('button', { name: status === 'COMPLETED' ? 'Confirm Completion' : 'Confirm Cancellation' })).toBeInTheDocument();
    const close = within(dialog).getByRole('button', { name: 'Close dialog' });
    close.focus(); fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('alert')).toHaveTextContent('Discard unsaved changes?');
    fireEvent.click(screen.getByRole('button', { name: 'Keep Editing' }));
    expect(screen.getByLabelText(fieldName)).toHaveValue('Connection restored');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Discard Draft' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('ignores an old account response after switching identity', async () => {
    let resolveOld!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>(resolve => { resolveOld = resolve; }));
    const mounted = mount('REQUESTER');
    mounted.rerender(<ActionsTaken ticketId={105} token="new-token" currentUser={{ id: 9, name: 'Other requester', role: 'REQUESTER' }}
      ticketStatus="OPEN" ticketVersion={4} onTicketChange={onTicketChange} />);
    await screen.findAllByText(action.description);
    await act(async () => { resolveOld(response({ data: [{ ...action, description: 'Old private account data' }], ticket: parent, pagination: { page: 1, totalPages: 1, totalItems: 1 } })); });
    await waitFor(() => expect(screen.queryByText('Old private account data')).not.toBeInTheDocument());
  });
  it('shows meaningful list failure and supports retry without fake empty data', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ error: { message: 'Service unavailable' } }, 500));
    mount('REQUESTER');
    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
    expect(screen.queryByText('No actions recorded.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect((await screen.findAllByText(action.description)).length).toBeGreaterThan(0);
  });
  it('retains an inactive historical assignee on a pending text edit without reassigning it', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (!init?.method && url.toString().includes('/actions-taken')) return response({ data: [{ ...action, assignee: { id: 99, name: 'Former staff', role: 'IT_STAFF' } }], ticket: parent, pagination: { page: 1, totalItems: 1, totalPages: 1 } });
      if (init?.method === 'PATCH') return response({ data: action, ticket: { ...parent, version: 5 } });
      return original(url, init);
    });
    const actor = userEvent.setup(); mount(); await screen.findAllByText('Former staff');
    await actor.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    await actor.type(screen.getByLabelText(/Action Description/), ' Updated note');
    await actor.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(onTicketChange).toHaveBeenCalled());
    const call = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === 'PATCH')!;
    expect(JSON.parse(call[1]!.body as string)).not.toHaveProperty('assigneeId');
  });
  it('refreshes authoritative state after 422 while retaining the draft and blocking writes on a resolved parent', async () => {
    let rejected = false;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (String(url).includes('/staff/members')) return response([user]);
      if (init?.method === 'POST') { rejected = true; return response({ error: { code: 'TICKET_NOT_ACTIVE', message: 'Ticket is now resolved.' } }, 422); }
      return response({ data: [action], ticket: { ...parent, ...(rejected ? { status: 'RESOLVED', version: 6 } : {}) }, pagination: { page: 1, totalItems: 1, totalPages: 1 } });
    });
    const actor = userEvent.setup(); mount();
    await actor.click(await screen.findByRole('button', { name: 'Add Action' }));
    await actor.type(screen.getByLabelText(/Action Description/), 'Retain this unresolved draft');
    await actor.click(screen.getByRole('button', { name: 'Save Action' }));
    await waitFor(() => expect(onTicketChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'RESOLVED', version: 6 })));
    expect(screen.getByLabelText(/Action Description/)).toHaveValue('Retain this unresolved draft');
    expect(screen.getByRole('button', { name: 'Save Action' })).toBeDisabled();
    await actor.click(screen.getByRole('button', { name: 'Reload Latest' }));
    expect(screen.getByRole('button', { name: 'Save Action' })).toBeDisabled();
    expect(screen.getByText(/This Ticket no longer accepts action changes/)).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });

  it.each([400, 500])('retains a known HTTP %i failure draft and permits a safe reviewed retry', async status => {
    const original = vi.mocked(fetch).getMockImplementation()!; let fail = true;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (init?.method === 'POST' && fail) return response({ error: { code: status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR', message: 'Synthetic save failure',
        ...(status === 400 ? { details: [{ field: 'description', message: 'Review the description' }] } : {}) } }, status);
      return original(url, init);
    });
    const actor = userEvent.setup(); mount();
    await actor.click(await screen.findByRole('button', { name: 'Add Action' }));
    await actor.type(screen.getByLabelText(/Action Description/), 'Keep this draft after a known failure');
    await actor.click(screen.getByRole('button', { name: 'Save Action' }));
    expect(await screen.findByText('Synthetic save failure')).toBeInTheDocument();
    expect(screen.getByLabelText(/Action Description/)).toHaveValue('Keep this draft after a known failure');
    if (status === 400) expect(screen.getByLabelText(/Action Description/)).toHaveAttribute('aria-invalid', 'true');
    fail = false; await actor.click(screen.getByRole('button', { name: 'Save Action' }));
    await waitFor(() => expect(onTicketChange).toHaveBeenCalled());
  });

  it.each(['empty', 'failure'] as const)('disables save for %s assignees and preserves the draft across retry', async mode => {
    const original = vi.mocked(fetch).getMockImplementation()!; let recover = false;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (String(url).includes('/staff/members') && !recover) return mode === 'empty' ? response([]) : response({ error: { message: 'Assignee fetch failed' } }, 500);
      return original(url, init);
    });
    const actor = userEvent.setup(); mount();
    await actor.click(await screen.findByRole('button', { name: 'Add Action' }));
    await actor.type(screen.getByLabelText(/Action Description/), 'Draft awaiting eligible staff');
    expect(screen.getByRole('button', { name: 'Save Action' })).toBeDisabled();
    recover = true; await actor.click(screen.getByRole('button', { name: 'Retry Assignees' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Action' })).toBeEnabled());
    expect(screen.getByLabelText(/Action Description/)).toHaveValue('Draft awaiting eligible staff');
  });

  it('sends only one create when submit is activated repeatedly before the response arrives', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!;
    let release!: (value: Response) => void;
    vi.mocked(fetch).mockImplementation(async (url, init) => init?.method === 'POST' ? new Promise<Response>(resolve => { release = resolve; }) : original(url, init));
    mount(); fireEvent.click(await screen.findByRole('button', { name: 'Add Action' }));
    const description = screen.getByLabelText(/Action Description/);
    fireEvent.change(description, { target: { value: 'One intended work item' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Action' })).toBeEnabled());
    const form = description.closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form); fireEvent.submit(form);
    expect(vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
    await act(async () => release(response({ data: action, ticket: { ...parent, version: 5 }, replayed: false }, 201)));
    await waitFor(() => expect(onTicketChange).toHaveBeenCalledTimes(1));
  });

  it('offers an enabled safe retry after a completed creation loses its response', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!; let fail = true;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (init?.method === 'POST' && fail) throw new TypeError('Lost completion response');
      return original(url, init);
    });
    const actor = userEvent.setup(); mount();
    await actor.click(await screen.findByRole('button', { name: 'Add Action' }));
    await actor.type(screen.getByLabelText(/Action Description/), 'Completed creation with lost response');
    await actor.selectOptions(screen.getByLabelText('Status'), 'COMPLETED');
    await actor.type(screen.getByLabelText('Result', { exact: false }), 'Verified completed result');
    await actor.click(screen.getByRole('button', { name: 'Save Action' }));
    await actor.click(screen.getByRole('button', { name: 'Confirm Completion' }));
    expect(await screen.findByRole('button', { name: 'Retry Previous Save' })).toBeEnabled();
    fail = false; await actor.click(screen.getByRole('button', { name: 'Retry Previous Save' }));
    await waitFor(() => expect(onTicketChange).toHaveBeenCalled());
    const attempts = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'POST');
    expect(attempts).toHaveLength(2); expect(attempts[0][1]?.body).toBe(attempts[1][1]?.body);
  });

});
