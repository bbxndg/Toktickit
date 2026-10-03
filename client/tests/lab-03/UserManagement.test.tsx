import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserManagement } from '../../src/pages/UserManagement';
import { AuthProvider } from '../../src/context/AuthContext';

describe('UI-06: Administrator User Management Screen Tests', () => {
  const currentAdmin = {
    id: 1,
    name: 'Admin Boss',
    email: 'admin@toktickit.local',
    role: 'ADMINISTRATOR',
    isActive: true,
    isPasswordChangeRequired: false,
  };

  const mockUsers = [
    {
      id: 1,
      name: 'Admin Boss',
      email: 'admin@toktickit.local',
      department: 'IT Admin',
      role: 'ADMINISTRATOR',
      isActive: true,
      isPasswordChangeRequired: false,
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 2,
      name: 'Jennifer Anderson',
      email: 'jennifer@toktickit.local',
      department: 'HR',
      role: 'REQUESTER',
      isActive: true,
      isPasswordChangeRequired: false,
      createdAt: '2026-09-02T00:00:00.000Z',
    },
    {
      id: 3,
      name: 'Alex Thompson',
      email: 'alex@toktickit.local',
      department: 'IT Support',
      role: 'IT_STAFF',
      isActive: true,
      isPasswordChangeRequired: true,
      createdAt: '2026-09-03T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem('toktickit_auth_token', 'mock-admin-token');
    localStorage.setItem('toktickit_auth_user', JSON.stringify(currentAdmin));
  });

  const setupFetchMock = () => {
    global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/auth/me')) {
        return Promise.resolve(new Response(JSON.stringify(currentAdmin), { status: 200 }));
      }
      if (urlStr.includes('/api/admin/users')) {
        return Promise.resolve(new Response(JSON.stringify(mockUsers), { status: 200 }));
      }
      return Promise.reject(new Error(`Unknown endpoint: ${urlStr}`));
    });
  };

  it('renders user directory table with roles and status badges', async () => {
    setupFetchMock();

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('user-row-2')).toBeInTheDocument();
      expect(screen.getByTestId('user-row-3')).toBeInTheDocument();
    });

    expect(screen.getByTestId('user-role-badge-1')).toHaveTextContent(/Admin/i);
    expect(screen.getByTestId('user-role-badge-2')).toHaveTextContent(/Requester/i);
    expect(screen.getByTestId('user-role-badge-3')).toHaveTextContent(/IT Staff/i);
  });

  it('opens create user modal and submits new account', async () => {
    setupFetchMock();

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('create-user-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('create-user-btn'));
    expect(screen.getByTestId('create-user-form')).toBeInTheDocument();

    await userEvent.type(screen.getByTestId('create-user-name'), 'New Support Agent');
    await userEvent.type(screen.getByTestId('create-user-email'), 'agent@toktickit.local');
    await userEvent.selectOptions(screen.getByTestId('create-user-role'), 'IT_STAFF');
    await userEvent.type(screen.getByTestId('create-user-password'), 'InitialPassword123!');

    // Mock successful user creation
    (global.fetch as any).mockImplementationOnce((url: string | URL | Request) => {
      if (url.toString().includes('/api/admin/users')) {
        return Promise.resolve(new Response(JSON.stringify({
          id: 4,
          name: 'New Support Agent',
          email: 'agent@toktickit.local',
          role: 'IT_STAFF',
          isActive: true,
          isPasswordChangeRequired: true,
        }), { status: 201 }));
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    fireEvent.click(screen.getByTestId('create-user-submit'));

    await waitFor(() => {
      expect(screen.queryByTestId('create-user-form')).not.toBeInTheDocument();
    });
  });

  it('disables self-deactivation and self-role changes when editing own account (BR-17)', async () => {
    setupFetchMock();

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('edit-user-btn-1')).toBeInTheDocument();
    });

    // Click edit on own account (id: 1)
    fireEvent.click(screen.getByTestId('edit-user-btn-1'));

    expect(screen.getByTestId('edit-user-form')).toBeInTheDocument();
    expect(screen.getByTestId('self-edit-alert')).toBeInTheDocument();
    expect(screen.getByTestId('self-edit-alert')).toHaveTextContent(/You are editing your own administrator account/i);

    // Active toggle and Role select must be disabled
    expect(screen.getByTestId('edit-user-active-toggle')).toBeDisabled();
    expect(screen.getByTestId('edit-user-role')).toBeDisabled();
  });

  it('allows editing other user accounts without self-deactivation restriction', async () => {
    setupFetchMock();

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('edit-user-btn-2')).toBeInTheDocument();
    });

    // Click edit on Jennifer (id: 2)
    fireEvent.click(screen.getByTestId('edit-user-btn-2'));

    expect(screen.getByTestId('edit-user-form')).toBeInTheDocument();
    expect(screen.queryByTestId('self-edit-alert')).not.toBeInTheDocument();

    // Active toggle and Role select should NOT be disabled
    expect(screen.getByTestId('edit-user-active-toggle')).not.toBeDisabled();
    expect(screen.getByTestId('edit-user-role')).not.toBeDisabled();
  });

  it('opens reset password modal and submits new initial password', async () => {
    setupFetchMock();

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('reset-pwd-btn-2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('reset-pwd-btn-2'));
    expect(screen.getByTestId('reset-password-form')).toBeInTheDocument();

    await userEvent.type(screen.getByTestId('reset-user-password-input'), 'ResetPassword123!');

    (global.fetch as any).mockImplementationOnce((url: string | URL | Request) => {
      if (url.toString().includes('/reset-password')) {
        return Promise.resolve(new Response(JSON.stringify({
          message: 'Initial password set successfully',
        }), { status: 200 }));
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    fireEvent.click(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(screen.queryByTestId('reset-password-form')).not.toBeInTheDocument();
    });
  });
});

