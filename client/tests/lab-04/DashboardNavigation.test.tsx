import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from '../../src/components/layout/Navbar';
let user = { id: 1, name: 'Requester', email: 'qa@test.local', role: 'REQUESTER', isPasswordChangeRequired: false };
vi.mock('../../src/context/AuthContext', () => ({ useAuth: () => ({ user, logout: vi.fn() }) }));
vi.mock('../../src/context/RequesterContext', () => ({ useRequester: () => ({ currentRequester: null }) }));
beforeEach(() => { user = { id: 1, name: 'Requester', email: 'qa@test.local', role: 'REQUESTER', isPasswordChangeRequired: false }; });
describe('Dashboard navigation accessibility', () => {
  it.each([['dashboard', 'Dashboard'], ['my-tickets', '📋 My Tickets'], ['create-ticket', '➕ Create Ticket']] as const)('marks current Requester view %s', (view, name) => {
    render(<Navbar currentView={view} onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name, current: 'page' })).toBeInTheDocument();
  });
  it.each([['ticket-queue', '📥 Ticket Queue'], ['user-management', '👥 User Management']] as const)('marks current Administrator view %s', (view, name) => {
    user.role = 'ADMINISTRATOR'; render(<Navbar currentView={view} onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name, current: 'page' })).toBeInTheDocument();
  });
  it('hides navigation when the first password change is required', () => {
    user.isPasswordChangeRequired = true; render(<Navbar currentView="dashboard" onNavigate={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-my-tickets')).not.toBeInTheDocument();
  });
});
