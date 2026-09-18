import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangePasswordModal } from '../../src/components/auth/ChangePasswordModal';
import { AuthProvider } from '../../src/context/AuthContext';

describe('UI-02: Mandatory Password Change Modal Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();

    global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      if (url.toString().includes('/api/auth/me')) {
        return Promise.resolve(new Response(JSON.stringify({
          id: 10,
          name: 'Temp User',
          email: 'temp@toktickit.local',
          role: 'REQUESTER',
          isActive: true,
          isPasswordChangeRequired: true,
        }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });
  });

  const setupUserWithPasswordChangeRequired = () => {
    const mockUser = {
      id: 10,
      name: 'Temp User',
      email: 'temp@toktickit.local',
      role: 'REQUESTER',
      isActive: true,
      isPasswordChangeRequired: true,
    };
    localStorage.setItem('toktickit_auth_token', 'mock-token');
    localStorage.setItem('toktickit_auth_user', JSON.stringify(mockUser));
  };

  it('renders mandatory modal and checklist when isPasswordChangeRequired is true', () => {
    setupUserWithPasswordChangeRequired();

    render(
      <AuthProvider>
        <ChangePasswordModal />
      </AuthProvider>
    );

    expect(screen.getByTestId('change-password-modal')).toBeInTheDocument();
    expect(screen.getByTestId('password-rules-checklist')).toBeInTheDocument();
    expect(screen.getByTestId('change-password-submit-btn')).toBeDisabled();
  });

  it('updates rule checklist dynamically as user types new password', async () => {
    setupUserWithPasswordChangeRequired();

    render(
      <AuthProvider>
        <ChangePasswordModal />
      </AuthProvider>
    );

    const currentPwdInput = screen.getByTestId('current-password-input');
    const newPwdInput = screen.getByTestId('new-password-input');
    const confirmPwdInput = screen.getByTestId('confirm-password-input');
    const submitBtn = screen.getByTestId('change-password-submit-btn');

    await userEvent.type(currentPwdInput, 'InitialPassword123!');

    // Initially all rules unmet for new password
    expect(screen.getByTestId('rule-min-length')).toHaveClass('text-muted');

    // Type 8 characters lowercase only
    await userEvent.type(newPwdInput, 'abcdefgh');
    expect(screen.getByTestId('rule-min-length')).toHaveClass('text-success');
    expect(screen.getByTestId('rule-lowercase')).toHaveClass('text-success');
    expect(screen.getByTestId('rule-uppercase')).toHaveClass('text-muted');
    expect(submitBtn).toBeDisabled();

    // Clear and type compliant password
    await userEvent.clear(newPwdInput);
    await userEvent.type(newPwdInput, 'StrongPassword123!');

    expect(screen.getByTestId('rule-min-length')).toHaveClass('text-success');
    expect(screen.getByTestId('rule-uppercase')).toHaveClass('text-success');
    expect(screen.getByTestId('rule-lowercase')).toHaveClass('text-success');
    expect(screen.getByTestId('rule-digit')).toHaveClass('text-success');
    expect(screen.getByTestId('rule-special')).toHaveClass('text-success');

    // Confirmation still not matching
    expect(screen.getByTestId('rule-match')).toHaveClass('text-muted');
    expect(submitBtn).toBeDisabled();

    // Type matching confirmation
    await userEvent.type(confirmPwdInput, 'StrongPassword123!');
    expect(screen.getByTestId('rule-match')).toHaveClass('text-success');
    expect(submitBtn).not.toBeDisabled();
  });

  it('submits password change and closes modal on success', async () => {
    setupUserWithPasswordChangeRequired();

    global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      if (url.toString().includes('/api/auth/me')) {
        return Promise.resolve(new Response(JSON.stringify({
          id: 10,
          name: 'Temp User',
          email: 'temp@toktickit.local',
          role: 'REQUESTER',
          isActive: true,
          isPasswordChangeRequired: true,
        }), { status: 200 }));
      }
      if (url.toString().includes('/api/auth/change-password')) {
        return Promise.resolve(new Response(JSON.stringify({
          message: 'Password updated successfully',
          isPasswordChangeRequired: false,
        }), { status: 200 }));
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    render(
      <AuthProvider>
        <ChangePasswordModal />
      </AuthProvider>
    );

    await userEvent.type(screen.getByTestId('current-password-input'), 'InitialPassword123!');
    await userEvent.type(screen.getByTestId('new-password-input'), 'SecurePassword999!');
    await userEvent.type(screen.getByTestId('confirm-password-input'), 'SecurePassword999!');

    fireEvent.click(screen.getByTestId('change-password-submit-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('change-password-modal')).not.toBeInTheDocument();
    });
  });
});
