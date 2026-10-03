import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Login } from '../../src/pages/Login';
import { AuthProvider } from '../../src/context/AuthContext';

describe('UI-01: Login Screen Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders login form with email, password fields and sign in button', () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-submit-button')).toBeInTheDocument();
    expect(screen.getByTestId('login-submit-button')).toHaveTextContent(/Sign In/i);
  });

  it('validates email format and required password before submitting', async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const submitBtn = screen.getByTestId('login-submit-button');

    // Attempt submit with empty fields
    fireEvent.click(submitBtn);

    expect(screen.getByTestId('login-email-error')).toHaveTextContent(/Email is required/i);
    expect(screen.getByTestId('login-password-error')).toHaveTextContent(/Password is required/i);

    // Attempt submit with invalid email format
    const emailInput = screen.getByTestId('login-email-input');
    await userEvent.type(emailInput, 'invalid-email');
    fireEvent.click(submitBtn);

    expect(screen.getByTestId('login-email-error')).toHaveTextContent(/valid email address/i);
  });

  it('displays busy state and disables submit button during authentication', async () => {
    // Mock slow fetch response
    let resolveLogin: any;
    global.fetch = vi.fn().mockImplementation(() =>
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
    );

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const emailInput = screen.getByTestId('login-email-input');
    const passwordInput = screen.getByTestId('login-password-input');
    const submitBtn = screen.getByTestId('login-submit-button');

    await userEvent.type(emailInput, 'test@toktickit.local');
    await userEvent.type(passwordInput, 'Password123!');

    fireEvent.click(submitBtn);

    // Expect button to be disabled and show loading indicator
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent(/Signing in.../i);

    // Resolve login
    resolveLogin({
      ok: true,
      json: async () => ({
        token: 'mock-jwt-token',
        user: { id: 1, name: 'Test User', email: 'test@toktickit.local', role: 'REQUESTER', isActive: true, isPasswordChangeRequired: false },
      }),
    });

    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });

  it('renders inline error feedback on invalid credentials or inactive account', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password, or account is deactivated.',
        },
      }),
    });

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const emailInput = screen.getByTestId('login-email-input');
    const passwordInput = screen.getByTestId('login-password-input');
    const submitBtn = screen.getByTestId('login-submit-button');

    await userEvent.type(emailInput, 'inactive@toktickit.local');
    await userEvent.type(passwordInput, 'WrongPassword!');

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('login-error-alert')).toBeInTheDocument();
      expect(screen.getByTestId('login-error-alert')).toHaveTextContent(/Invalid email or password/i);
    });
  });
});

