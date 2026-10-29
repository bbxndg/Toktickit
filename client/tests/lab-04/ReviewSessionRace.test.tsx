import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
const staff = { id: 42, name: 'Review Staff', email: 'staff@test.local', role: 'IT_STAFF', isActive: true, isPasswordChangeRequired: false };
const requester = { id: 43, name: 'Review Requester', email: 'requester@test.local', role: 'REQUESTER', isActive: true, isPasswordChangeRequired: true };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
let finishMe: (response: Response) => void;
let pendingMe: Promise<Response>;
const dashboard = { generatedAt: '2026-10-29T00:00:00Z', metrics: { activeTickets: 0, unassignedTickets: 0, myAssignedTickets: 0, waitingForRequester: 0 }, recentTickets: [], byStatus: {}, byItPriority: {}, myPendingActions: { totalItems: 0, data: [] }, drillDown: {} };
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); pendingMe = new Promise(resolve => { finishMe = resolve; }); });
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function login(email: string) {
  const actor = userEvent.setup(); await actor.type(screen.getByTestId('login-email-input'), email);
  await actor.type(screen.getByTestId('login-password-input'), 'Password123!'); await actor.click(screen.getByTestId('login-submit-button')); return actor;
}
describe('Peer review: delayed session response', () => {
  it('retains the selected queue filter and view when /me refreshes the same account', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('/auth/login')) return json({ token: 'test-token', user: staff });
      if (url.includes('/auth/me')) return pendingMe;
      if (url.includes('/dashboard/staff')) return json(dashboard);
      if (url.includes('/staff/tickets?')) return json({ data: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 } });
      return json([]);
    }));
    render(<App />); const actor = await login(staff.email);
    await actor.click(await screen.findByTestId('nav-ticket-queue'));
    const filter = await screen.findByTestId('staff-queue-status-filter');
    await actor.selectOptions(filter, 'WAITING_FOR_REQUESTER');
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('status=WAITING_FOR_REQUESTER'))).toBe(true));
    await act(async () => { finishMe(json({ ...staff })); await pendingMe; });
    expect(screen.getByTestId('staff-ticket-queue')).toBeInTheDocument();
    expect(screen.getByTestId('staff-queue-status-filter')).toHaveValue('WAITING_FOR_REQUESTER');
  });
  it('does not reapply the password gate when an older /me response arrives after a password change', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('/auth/login')) return json({ token: 'test-token', user: requester });
      if (url.includes('/auth/me')) return pendingMe;
      if (url.includes('/auth/change-password')) return json({ message: 'Password changed' });
      if (url.includes('/dashboard/requester')) return json({ ...dashboard, metrics: {}, drillDown: {} });
      return json([]);
    }));
    render(<App />); const actor = await login(requester.email);
    expect(await screen.findByTestId('change-password-modal')).toBeInTheDocument();
    await actor.type(screen.getByTestId('current-password-input'), 'Password123!');
    await actor.type(screen.getByTestId('new-password-input'), 'NewPassword123!');
    await actor.type(screen.getByTestId('confirm-password-input'), 'NewPassword123!');
    await actor.click(screen.getByTestId('change-password-submit-btn'));
    await waitFor(() => expect(screen.queryByTestId('change-password-modal')).not.toBeInTheDocument());
    await act(async () => { finishMe(json({ ...requester })); await pendingMe; });
    expect(screen.queryByTestId('change-password-modal')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('toktickit_auth_user')!).isPasswordChangeRequired).toBe(false);
  });
  it('resets navigation when the refreshed account role actually changes', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('/auth/login')) return json({ token: 'test-token', user: staff });
      if (url.includes('/auth/me')) return pendingMe;
      if (url.includes('/dashboard/staff')) return json(dashboard);
      if (url.includes('/staff/tickets?')) return json({ data: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 } });
      return json([]);
    }));
    render(<App />); const actor = await login(staff.email);
    await actor.click(await screen.findByTestId('nav-ticket-queue'));
    expect(await screen.findByTestId('staff-ticket-queue')).toBeInTheDocument();
    await act(async () => { finishMe(json({ ...staff, role: 'ADMINISTRATOR' })); await pendingMe; });
    expect(await screen.findByRole('region', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByTestId('nav-user-management')).toBeInTheDocument();
    expect(screen.queryByTestId('staff-ticket-queue')).not.toBeInTheDocument();
  });
});
