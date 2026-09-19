import React, { useState, useEffect } from 'react';
import { useAuth, type UserRole } from '../context/AuthContext';

interface ManagedUser {
  id: number;
  name: string;
  email: string;
  department: string | null;
  role: UserRole;
  isActive: boolean;
  isPasswordChangeRequired: boolean;
  createdAt: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const UserManagement: React.FC = () => {
  const { user: currentAdmin, token } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [resettingUser, setResettingUser] = useState<ManagedUser | null>(null);

  // Form states for Create
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createDepartment, setCreateDepartment] = useState('');
  const [createRole, setCreateRole] = useState<UserRole>('REQUESTER');
  const [createPassword, setCreatePassword] = useState('');
  const [createActive, setCreateActive] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Form states for Edit
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('REQUESTER');
  const [editActive, setEditActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Form states for Reset Password
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (roleFilter) params.append('role', roleFilter);

      const res = await fetch(`${API_BASE}/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch user accounts');
      }

      const data = await res.json();
      setUsers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, roleFilter]);

  // Active admin count
  const activeAdminCount = users.filter((u) => u.role === 'ADMINISTRATOR' && u.isActive).length;

  const handleOpenEdit = (user: ManagedUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditDepartment(user.department || '');
    setEditRole(user.role);
    setEditActive(user.isActive);
    setEditError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsSubmittingCreate(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createName.trim(),
          email: createEmail.trim(),
          department: createDepartment.trim() || null,
          role: createRole,
          initialPassword: createPassword,
          isActive: createActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error?.message || 'Failed to create user account.');
        setIsSubmittingCreate(false);
        return;
      }

      setIsCreateOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreateDepartment('');
      setCreatePassword('');
      setCreateActive(true);
      setSuccessMessage(`User "${data.name}" created successfully.`);
      fetchUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Network error.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditError(null);
    setIsSubmittingEdit(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          department: editDepartment.trim() || null,
          role: editRole,
          isActive: editActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error?.message || 'Failed to update user account.');
        setIsSubmittingEdit(false);
        return;
      }

      setEditingUser(null);
      setSuccessMessage(`User "${data.name}" updated successfully.`);
      fetchUsers();
    } catch (err: any) {
      setEditError(err.message || 'Network error.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;

    setResetError(null);
    setIsSubmittingReset(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${resettingUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          initialPassword: resetPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error?.message || 'Failed to reset password.');
        setIsSubmittingReset(false);
        return;
      }

      setResettingUser(null);
      setResetPassword('');
      setSuccessMessage(`Password reset successfully for "${resettingUser.name}". User must change password on next login.`);
      fetchUsers();
    } catch (err: any) {
      setResetError(err.message || 'Network error.');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  return (
    <div className="user-management-container" data-testid="user-management-screen">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--zg-primary)' }}>
            👥 User Management
          </h2>
          <p className="text-muted small mb-0">Manage system users, roles, and credential lifecycles</p>
        </div>
        <button
          type="button"
          className="btn btn-primary fw-bold"
          onClick={() => {
            setCreateError(null);
            setIsCreateOpen(true);
          }}
          data-testid="create-user-btn"
          style={{ backgroundColor: 'var(--zg-primary)', borderColor: 'var(--zg-primary)' }}
        >
          ➕ Add New User
        </button>
      </div>

      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show py-2 small mb-4" role="alert" data-testid="user-success-alert">
          <span>✓ {successMessage}</span>
          <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)} aria-label="Close"></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 small mb-4" data-testid="user-error-alert">
          ⚠️ {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="row g-2">
            <div className="col-12 col-md-8">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="user-search-input"
              />
            </div>
            <div className="col-12 col-md-4">
              <select
                className="form-select form-select-sm"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                data-testid="user-role-filter"
              >
                <option value="">All Roles</option>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* User Directory Table */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" data-testid="users-table">
            <thead className="table-light">
              <tr className="small text-muted">
                <th>User</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th>Password State</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted small">
                    <span className="spinner-border spinner-border-sm me-2"></span> Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted small">
                    No users match the search criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = currentAdmin?.id === u.id;
                  return (
                    <tr key={u.id} data-testid={`user-row-${u.id}`}>
                      <td>
                        <div className="fw-semibold">
                          {u.name} {isSelf && <span className="badge bg-light text-dark border ms-1">You</span>}
                        </div>
                        <div className="text-muted small">{u.email}</div>
                      </td>
                      <td className="small">{u.department || '—'}</td>
                      <td>
                        <span
                          className={`badge ${
                            u.role === 'ADMINISTRATOR'
                              ? 'bg-danger'
                              : u.role === 'IT_STAFF'
                              ? 'bg-primary'
                              : 'bg-secondary'
                          }`}
                          title={
                            u.role === 'ADMINISTRATOR'
                              ? 'Administrator: Full system configuration & user management'
                              : u.role === 'IT_STAFF'
                              ? 'IT Staff: Ticket queue management, triage, and operational updates'
                              : 'Requester: Submit and track service requests'
                          }
                          data-testid={`user-role-badge-${u.id}`}
                        >
                          {u.role === 'ADMINISTRATOR' ? 'Admin' : u.role === 'IT_STAFF' ? 'IT Staff' : 'Requester'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${u.isActive ? 'bg-success' : 'bg-secondary'}`}
                          data-testid={`user-status-badge-${u.id}`}
                        >
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="small">
                        {u.isPasswordChangeRequired ? (
                          <span className="text-warning fw-semibold">⚠️ Change Required</span>
                        ) : (
                          <span className="text-success">✓ Set</span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => handleOpenEdit(u)}
                            data-testid={`edit-user-btn-${u.id}`}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              setResettingUser(u);
                              setResetPassword('');
                              setResetError(null);
                            }}
                            data-testid={`reset-pwd-btn-${u.id}`}
                          >
                            🔑 Reset Pwd
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Create New User Account</h5>
                <button type="button" className="btn-close" onClick={() => setIsCreateOpen(false)}></button>
              </div>
              <form onSubmit={handleCreateSubmit} data-testid="create-user-form">
                <div className="modal-body">
                  {createError && <div className="alert alert-danger py-2 small mb-3">{createError}</div>}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      required
                      data-testid="create-user-name"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      required
                      data-testid="create-user-email"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Department</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={createDepartment}
                      onChange={(e) => setCreateDepartment(e.target.value)}
                      data-testid="create-user-department"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Role *</label>
                    <select
                      className="form-select form-select-sm"
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as UserRole)}
                      data-testid="create-user-role"
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Initial Password *</label>
                    <input
                      type="password"
                      className="form-control form-control-sm"
                      placeholder="Min 8 chars with uppercase, lowercase, digit, symbol"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      required
                      data-testid="create-user-password"
                    />
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                      User will be required to change this password on their first login.
                    </small>
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="createActiveCheck"
                      checked={createActive}
                      onChange={(e) => setCreateActive(e.target.checked)}
                      data-testid="create-user-active"
                    />
                    <label className="form-check-label small" htmlFor="createActiveCheck">
                      Active Account
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm fw-bold"
                    disabled={isSubmittingCreate}
                    data-testid="create-user-submit"
                  >
                    {isSubmittingCreate ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Edit User: {editingUser.name}</h5>
                <button type="button" className="btn-close" onClick={() => setEditingUser(null)}></button>
              </div>
              <form onSubmit={handleEditSubmit} data-testid="edit-user-form">
                <div className="modal-body">
                  {editError && <div className="alert alert-danger py-2 small mb-3">{editError}</div>}

                  {/* Safety rule notices */}
                  {currentAdmin?.id === editingUser.id && (
                    <div className="alert alert-warning py-2 small mb-3" data-testid="self-edit-alert">
                      🛡️ <strong>Safety Rule:</strong> You are editing your own administrator account. You cannot deactivate your own administrator account or remove your administrator role.
                    </div>
                  )}

                  {editingUser.role === 'ADMINISTRATOR' && editingUser.isActive && activeAdminCount <= 1 && currentAdmin?.id !== editingUser.id && (
                    <div className="alert alert-warning py-2 small mb-3" data-testid="last-admin-alert">
                      🛡️ <strong>Safety Rule:</strong> At least one active Administrator must remain in the system. Their account cannot be deactivated or demoted.
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      data-testid="edit-user-name"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                      data-testid="edit-user-email"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Department</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      data-testid="edit-user-department"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Role *</label>
                    <select
                      className="form-select form-select-sm"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      disabled={currentAdmin?.id === editingUser.id || (editingUser.role === 'ADMINISTRATOR' && activeAdminCount <= 1)}
                      data-testid="edit-user-role"
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="editActiveSwitch"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      disabled={
                        currentAdmin?.id === editingUser.id ||
                        (editingUser.role === 'ADMINISTRATOR' && activeAdminCount <= 1 && editActive)
                      }
                      data-testid="edit-user-active-toggle"
                    />
                    <label className="form-check-label small" htmlFor="editActiveSwitch">
                      Account Active
                    </label>
                  </div>
                  {currentAdmin?.id === editingUser.id && (
                    <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                      Self-deactivation is disabled by policy.
                    </small>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingUser(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm fw-bold"
                    disabled={isSubmittingEdit}
                    data-testid="edit-user-submit"
                  >
                    {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Reset Password: {resettingUser.name}</h5>
                <button type="button" className="btn-close" onClick={() => setResettingUser(null)}></button>
              </div>
              <form onSubmit={handleResetSubmit} data-testid="reset-password-form">
                <div className="modal-body">
                  <p className="text-muted small">
                    Assign a new initial password. The user will be required to change it upon their next sign-in.
                  </p>
                  {resetError && <div className="alert alert-danger py-2 small mb-3">{resetError}</div>}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">New Initial Password *</label>
                    <input
                      type="password"
                      className="form-control form-control-sm"
                      placeholder="Min 8 chars, uppercase, lowercase, digit, symbol"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      required
                      data-testid="reset-user-password-input"
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setResettingUser(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm fw-bold"
                    disabled={isSubmittingReset}
                    data-testid="reset-password-submit"
                  >
                    {isSubmittingReset ? 'Setting...' : 'Set Initial Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
