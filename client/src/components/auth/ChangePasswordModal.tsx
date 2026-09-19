import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export const ChangePasswordModal: React.FC = () => {
  const { user, changePassword, logout, isLoading } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  }, [user?.id, user?.isPasswordChangeRequired]);

  if (!user || !user.isPasswordChangeRequired) {
    return null;
  }

  // Rule verification
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(newPassword);
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const isDifferentFromCurrent = !currentPassword || !newPassword || currentPassword !== newPassword;

  const isFormValid =
    currentPassword.length > 0 &&
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasDigit &&
    hasSpecial &&
    isMatching &&
    isDifferentFromCurrent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (currentPassword === newPassword) {
      setError('New password must be different from your current/temporary password.');
      return;
    }

    if (!isFormValid) return;

    const res = await changePassword(currentPassword, newPassword, confirmPassword);
    if (!res.success) {
      setError(res.error || 'Failed to update password.');
    }
  };

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      role="dialog"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
      data-testid="change-password-modal"
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content border-0 shadow">
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title fw-bold" style={{ color: 'var(--zg-primary)' }}>
              🔒 Password Change Required
            </h5>
          </div>

          <form onSubmit={handleSubmit} data-testid="change-password-form" autoComplete="off">
            {/* Hidden field to give browser password managers clear account context and prevent improper autofill */}
            <input
              type="text"
              name="username"
              value={user.email}
              autoComplete="username"
              style={{ display: 'none' }}
              readOnly
            />

            <div className="modal-body py-3">
              <p className="text-muted small mb-3">
                For security compliance, you must set a new password before accessing your account features.
              </p>

              {error && (
                <div className="alert alert-danger py-2 small mb-3" data-testid="change-password-error">
                  ⚠️ {error}
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small fw-semibold">Current / Temporary Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter current or temporary password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                  data-testid="current-password-input"
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">New Password</label>
                <input
                  type="password"
                  className={`form-control ${currentPassword && newPassword && currentPassword === newPassword ? 'is-invalid' : ''}`}
                  placeholder="Enter compliant new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="new-password"
                  data-testid="new-password-input"
                />
                {currentPassword && newPassword && currentPassword === newPassword && (
                  <div className="invalid-feedback">New password must be different from current password.</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Confirm New Password</label>
                <input
                  type="password"
                  className={`form-control ${confirmPassword && !isMatching ? 'is-invalid' : ''}`}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="new-password"
                  data-testid="confirm-password-input"
                />
                {confirmPassword && !isMatching && (
                  <div className="invalid-feedback">Passwords do not match.</div>
                )}
              </div>

              {/* Password complexity checklist */}
              <div className="card bg-light border-0 p-3 rounded-2 mb-2" data-testid="password-rules-checklist">
                <span className="small fw-semibold mb-2 d-block">Password Requirements:</span>
                <ul className="list-unstyled mb-0 small" style={{ fontSize: '0.8rem' }}>
                  <li className={hasMinLength ? 'text-success' : 'text-muted'} data-testid="rule-min-length">
                    {hasMinLength ? '✓' : '○'} At least 8 characters
                  </li>
                  <li className={hasUppercase ? 'text-success' : 'text-muted'} data-testid="rule-uppercase">
                    {hasUppercase ? '✓' : '○'} At least one uppercase letter (A-Z)
                  </li>
                  <li className={hasLowercase ? 'text-success' : 'text-muted'} data-testid="rule-lowercase">
                    {hasLowercase ? '✓' : '○'} At least one lowercase letter (a-z)
                  </li>
                  <li className={hasDigit ? 'text-success' : 'text-muted'} data-testid="rule-digit">
                    {hasDigit ? '✓' : '○'} At least one numeric digit (0-9)
                  </li>
                  <li className={hasSpecial ? 'text-success' : 'text-muted'} data-testid="rule-special">
                    {hasSpecial ? '✓' : '○'} At least one special character (!@#$%^&*...)
                  </li>
                  <li className={isMatching ? 'text-success' : 'text-muted'} data-testid="rule-match">
                    {isMatching ? '✓' : '○'} Passwords match
                  </li>
                </ul>
              </div>
            </div>

            <div className="modal-footer border-top-0 d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={logout}
                disabled={isLoading}
                data-testid="cancel-logout-btn"
              >
                Sign Out
              </button>
              <button
                type="submit"
                className="btn btn-primary fw-bold"
                disabled={!isFormValid || isLoading}
                data-testid="change-password-submit-btn"
                style={{
                  backgroundColor: 'var(--zg-primary)',
                  borderColor: 'var(--zg-primary)',
                }}
              >
                {isLoading ? 'Updating...' : 'Set New Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

