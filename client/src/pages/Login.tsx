import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface LoginProps {
  onSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validate = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Email is required.');
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setEmailError('Please enter a valid email address.');
        isValid = false;
      }
    }

    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validate()) return;

    const ok = await login(email.trim(), password);
    if (ok && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center py-4 w-100">
      <div className="card shadow-sm border-0" style={{ maxWidth: '440px', width: '100%', borderRadius: '12px' }}>
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <span className="fs-1">🎫</span>
            <h2 className="fw-bold mt-2 mb-1" style={{ color: 'var(--zg-primary)' }}>TokTickIT</h2>
            <p className="text-muted small">Sign in to access your IT Service Desk</p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small d-flex align-items-center mb-3" role="alert" data-testid="login-error-alert">
              <span className="me-2">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate data-testid="login-form">
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label fw-semibold small">Email Address</label>
              <input
                id="login-email"
                type="email"
                className={`form-control ${emailError ? 'is-invalid' : ''}`}
                placeholder="name@toktickit.local"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                disabled={isLoading}
                data-testid="login-email-input"
                autoComplete="email"
              />
              {emailError && <div className="invalid-feedback" data-testid="login-email-error">{emailError}</div>}
            </div>

            <div className="mb-4">
              <label htmlFor="login-password" className="form-label fw-semibold small">Password</label>
              <input
                id="login-password"
                type="password"
                className={`form-control ${passwordError ? 'is-invalid' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                disabled={isLoading}
                data-testid="login-password-input"
                autoComplete="current-password"
              />
              {passwordError && <div className="invalid-feedback" data-testid="login-password-error">{passwordError}</div>}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 fw-bold py-2"
              disabled={isLoading}
              data-testid="login-submit-button"
              style={{
                backgroundColor: 'var(--zg-primary)',
                borderColor: 'var(--zg-primary)',
              }}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
