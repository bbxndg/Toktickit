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
});
