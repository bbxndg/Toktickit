import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../../src/App';
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
it('does not show cached dashboard or navigation before the server confirms the first-password gate', async () => {
  const cached = { id: 17, name: 'Cached', email: 'cached@test.local', role: 'REQUESTER', isActive: true, isPasswordChangeRequired: false };
  localStorage.setItem('toktickit_auth_token', 'cached-token'); localStorage.setItem('toktickit_auth_user', JSON.stringify(cached));
  let finish!: (value: Response) => void;
  const pending = new Promise<Response>(resolve => { finish = resolve; });
  vi.stubGlobal('fetch', vi.fn((url: string) => url.includes('/auth/me') ? pending : Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))));
  render(<App />);
  expect(screen.getByText('Checking session...')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeInTheDocument();
  await act(async () => { finish(new Response(JSON.stringify({ ...cached, isPasswordChangeRequired: true }), { status: 200 })); await pending; });
  expect(await screen.findByTestId('change-password-modal')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText('Checking session...')).not.toBeInTheDocument());
  expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('/api/dashboard/'))).toBe(false);
});
