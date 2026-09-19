import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AttachmentItem {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isRemoved: boolean;
  removedAt: string | null;
  removalReason: string | null;
  createdAt: string;
}

interface TicketDetailData {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: string;
  itPriority: string | null;
  status: string;
  categoryId: number;
  category: { id: number; name: string };
  relatedSystemId: number;
  relatedSystem: { id: number; name: string };
  requesterId: number;
  requester: { id: number; name: string; email: string; department?: string };
  ownerId: number | null;
  owner: { id: number; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  attachments: AttachmentItem[];
  activeAttachmentsCount: number;
}

const PERMITTED_STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ['OPEN', 'IN_PROGRESS', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: [],
  REOPENED: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  CANCELLED: [],
};

const TERMINAL_STATUSES = ['RESOLVED', 'CLOSED', 'CANCELLED'];

interface StaffTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

export const StaffTicketDetail: React.FC<StaffTicketDetailProps> = ({ ticketId, onBack }) => {
  const { token, user } = useAuth();

  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [operationMsg, setOperationMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Operational form states
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Terminal state confirmation modal
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [terminalReason, setTerminalReason] = useState<string>('');
  const [isConfirmingTerminal, setIsConfirmingTerminal] = useState(false);

  // Active Tab: comments, notes, attachments
  const [activeTab, setActiveTab] = useState<'comments' | 'notes' | 'attachments'>('attachments');

  // Load ticket details
  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/staff/tickets/${ticketId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(res.status === 404 ? 'Ticket not found.' : `Failed to load ticket (${res.status})`);
      }

      const data: TicketDetailData = await res.json();
      setTicket(data);
      setSelectedOwner(data.ownerId ? String(data.ownerId) : '');
      setSelectedPriority(data.itPriority || data.requestedPriority);
      setSelectedStatus(data.status);
    } catch (err: any) {
      setError(err.message || 'Unable to load ticket details.');
    } finally {
      setLoading(false);
    }
  }, [ticketId, token]);

  // Load staff members for assignment
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/staff/members`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const members = await res.json();
          setStaffMembers(members);
        }
      } catch (err) {
        console.error('Failed to load staff list:', err);
      }
    };

    fetchStaff();
    fetchTicket();
  }, [fetchTicket, token]);

  const showToast = (type: 'success' | 'danger', text: string) => {
    setOperationMsg({ type, text });
    setTimeout(() => setOperationMsg(null), 4000);
  };

  // Claim Ticket
  const handleClaimTicket = async () => {
    if (!ticket) return;
    try {
      const res = await fetch(`${API_BASE}/api/staff/tickets/${ticket.id}/claim`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to claim ticket.');
      }

      const updated = await res.json();
      setTicket((prev) => (prev ? { ...prev, ownerId: updated.ownerId, owner: updated.owner, status: updated.status } : null));
      setSelectedOwner(String(updated.ownerId));
      setSelectedStatus(updated.status);
      showToast('success', `You claimed ticket #${updated.ticketNumber}. Status updated to ${updated.status}.`);
    } catch (err: any) {
      showToast('danger', err.message);
    }
  };

  // Reassign Ticket Owner
  const handleAssignOwner = async (newOwnerId: string) => {
    if (!ticket) return;
    try {
      const res = await fetch(`${API_BASE}/api/staff/tickets/${ticket.id}/assign`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ownerId: newOwnerId === '' ? null : Number(newOwnerId) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to reassign ticket.');
      }

      const updated = await res.json();
      setTicket((prev) => (prev ? { ...prev, ownerId: updated.ownerId, owner: updated.owner, status: updated.status } : null));
      setSelectedOwner(newOwnerId);
      setSelectedStatus(updated.status);
      showToast('success', updated.owner ? `Ticket assigned to ${updated.owner.name}.` : 'Ticket unassigned.');
    } catch (err: any) {
      showToast('danger', err.message);
      setSelectedOwner(ticket.ownerId ? String(ticket.ownerId) : '');
    }
  };

  // Update IT Priority
  const handleUpdatePriority = async (newPrio: string) => {
    if (!ticket) return;
    try {
      const res = await fetch(`${API_BASE}/api/staff/tickets/${ticket.id}/priority`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itPriority: newPrio }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to update priority.');
      }

      const updated = await res.json();
      setTicket((prev) => (prev ? { ...prev, itPriority: updated.itPriority } : null));
      setSelectedPriority(updated.itPriority);
      showToast('success', `IT Priority updated to ${updated.itPriority}.`);
    } catch (err: any) {
      showToast('danger', err.message);
      setSelectedPriority(ticket.itPriority || ticket.requestedPriority);
    }
  };

  // Handle Status Transition
  const handleStatusChangeSelect = (newStatus: string) => {
    if (!ticket || newStatus === ticket.status) return;

    if (TERMINAL_STATUSES.includes(newStatus)) {
      setPendingStatus(newStatus);
      setTerminalReason('');
      setIsConfirmingTerminal(true);
    } else {
      executeStatusTransition(newStatus);
    }
  };

  const executeStatusTransition = async (targetStatus: string, reason?: string) => {
    if (!ticket) return;
    try {
      const res = await fetch(`${API_BASE}/api/staff/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: targetStatus, reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Status transition not allowed.');
      }

      const updated = await res.json();
      setTicket((prev) => (prev ? { ...prev, status: updated.status } : null));
      setSelectedStatus(updated.status);
      showToast('success', `Ticket status updated to ${updated.status}.`);
    } catch (err: any) {
      showToast('danger', err.message);
      setSelectedStatus(ticket.status);
    } finally {
      setIsConfirmingTerminal(false);
      setPendingStatus(null);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="container py-5 text-center" data-testid="staff-detail-loading">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading ticket details...</span>
        </div>
        <p className="mt-2 text-muted small">Loading ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger shadow-sm">
          <strong>Error:</strong> {error || 'Ticket could not be found.'}
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
          ← Back to Queue
        </button>
      </div>
    );
  }

  const activeAttachments = ticket.attachments?.filter((a) => !a.isRemoved) || [];
  const removedAttachments = ticket.attachments?.filter((a) => a.isRemoved) || [];
  const permittedTransitions = PERMITTED_STATUS_TRANSITIONS[ticket.status] || [];

  return (
    <div className="container-fluid px-0" data-testid="staff-ticket-detail">
      {/* Header Bar & Breadcrumb */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none fw-bold"
                onClick={onBack}
                style={{ color: 'var(--zg-primary)' }}
              >
                📥 Ticket Queue
              </button>
            </li>
            <li className="breadcrumb-item active font-monospace" aria-current="page">
              {ticket.ticketNumber}
            </li>
          </ol>
        </nav>

        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack} data-testid="back-to-queue-btn">
          ← Back to Queue
        </button>
      </div>

      {/* Operation alert toast */}
      {operationMsg && (
        <div
          className={`alert alert-${operationMsg.type} py-2 small mb-3 shadow-sm d-flex justify-content-between align-items-center`}
          role="alert"
        >
          <span>{operationMsg.text}</span>
          <button type="button" className="btn-close btn-sm" onClick={() => setOperationMsg(null)}></button>
        </div>
      )}

      {/* Operational Action Strip */}
      <div className="card shadow-sm border-0 mb-4 p-3 bg-white" data-testid="staff-operational-strip">
        <div className="row g-3 align-items-center">
          {/* Owner Assignment */}
          <div className="col-12 col-md-4">
            <label className="form-label small fw-bold text-muted mb-1 d-flex justify-content-between">
              <span>Ticket Owner</span>
              {!ticket.owner && (
                <span className="text-warning fw-normal" style={{ fontSize: '0.75rem' }}>
                  ⚠️ Unassigned
                </span>
              )}
            </label>
            <div className="input-group input-group-sm">
              <select
                className="form-select"
                value={selectedOwner}
                onChange={(e) => handleAssignOwner(e.target.value)}
                data-testid="assign-owner-select"
              >
                <option value="">-- Unassigned --</option>
                {staffMembers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role === 'ADMINISTRATOR' ? 'Admin' : 'Staff'})
                  </option>
                ))}
              </select>

              {(!ticket.owner || ticket.owner.id !== user?.id) && (
                <button
                  type="button"
                  className="btn btn-success text-nowrap"
                  onClick={handleClaimTicket}
                  data-testid="claim-ticket-btn"
                  title="Claim ownership for yourself"
                >
                  Claim
                </button>
              )}
            </div>
          </div>

          {/* IT Priority Selector */}
          <div className="col-6 col-md-4">
            <label className="form-label small fw-bold text-muted mb-1">
              IT Priority <span className="fw-normal text-muted" style={{ fontSize: '0.75rem' }}>(Req: {ticket.requestedPriority})</span>
            </label>
            <select
              className="form-select form-select-sm"
              value={selectedPriority}
              onChange={(e) => handleUpdatePriority(e.target.value)}
              data-testid="it-priority-select"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          {/* Status Workflow Transition */}
          <div className="col-6 col-md-4">
            <label className="form-label small fw-bold text-muted mb-1">
              Ticket Status <span className="badge bg-light text-dark border ms-1">{ticket.status}</span>
            </label>
            <select
              className="form-select form-select-sm"
              value={selectedStatus}
              onChange={(e) => handleStatusChangeSelect(e.target.value)}
              data-testid="status-transition-select"
              disabled={permittedTransitions.length === 0}
            >
              <option value={ticket.status} disabled>
                Current: {ticket.status}
              </option>
              {permittedTransitions.map((st) => (
                <option key={st} value={st}>
                  ➔ Transition to {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Read-Only Ticket Overview */}
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm border-0 p-4 mb-4 bg-white" data-testid="ticket-overview-card">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <span className="badge bg-light text-success font-monospace fs-6 mb-2 border">
                  {ticket.ticketNumber}
                </span>
                <h4 className="fw-bold text-dark mb-1">{ticket.summary}</h4>
              </div>
            </div>

            <div className="card bg-light border-0 p-3 mb-3">
              <h6 className="fw-semibold small text-muted text-uppercase mb-2">Description</h6>
              <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {ticket.description}
              </p>
            </div>

            {/* Requester & Category Info Grid */}
            <div className="row g-2 pt-2 border-top small">
              <div className="col-6">
                <span className="text-muted d-block">Requester:</span>
                <strong>{ticket.requester.name}</strong>
                <div className="text-muted">{ticket.requester.department || ticket.requester.email}</div>
              </div>
              <div className="col-6">
                <span className="text-muted d-block">Category & System:</span>
                <strong>{ticket.category.name}</strong>
                <div className="text-muted">{ticket.relatedSystem.name}</div>
              </div>
              <div className="col-6 mt-3">
                <span className="text-muted d-block">Created Date:</span>
                <span>{formatDate(ticket.createdAt)}</span>
              </div>
              <div className="col-6 mt-3">
                <span className="text-muted d-block">Last Updated:</span>
                <span>{formatDate(ticket.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interaction Tabs (Attachments + Stubs for Comments/Notes in Issue 4) */}
        <div className="col-12 col-lg-5">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-header bg-white border-bottom-0 pb-0 pt-3">
              <ul className="nav nav-tabs card-header-tabs" role="tablist">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 'attachments' ? 'active fw-bold text-success' : 'text-muted'}`}
                    onClick={() => setActiveTab('attachments')}
                  >
                    📎 Attachments ({activeAttachments.length})
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 'comments' ? 'active fw-bold' : 'text-muted'}`}
                    onClick={() => setActiveTab('comments')}
                  >
                    💬 Public Comments
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 'notes' ? 'active fw-bold text-warning' : 'text-muted'}`}
                    onClick={() => setActiveTab('notes')}
                  >
                    🔒 Internal Notes
                  </button>
                </li>
              </ul>
            </div>

            <div className="card-body p-3">
              {/* Attachments Tab */}
              {activeTab === 'attachments' && (
                <div data-testid="attachments-tab-pane">
                  <h6 className="fw-bold small mb-3">Active Ticket Attachments</h6>
                  {activeAttachments.length === 0 ? (
                    <p className="text-muted small mb-3">No active attachments attached to this ticket.</p>
                  ) : (
                    <div className="list-group list-group-flush mb-3">
                      {activeAttachments.map((att) => (
                        <div
                          key={att.id}
                          className="list-group-item px-0 d-flex justify-content-between align-items-center"
                          data-testid={`attachment-item-${att.id}`}
                        >
                          <div className="text-truncate me-2">
                            <span className="me-2">📄</span>
                            <span className="fw-semibold small">{att.originalName}</span>
                            <small className="text-muted ms-2">({formatFileSize(att.sizeBytes)})</small>
                          </div>
                          <a
                            href={`${API_BASE}/api/attachments/${att.id}/download`}
                            className="btn btn-outline-secondary btn-sm py-0 px-2"
                            download
                            data-testid={`download-btn-${att.id}`}
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Soft-removed attachments history */}
                  {removedAttachments.length > 0 && (
                    <div className="mt-3 pt-3 border-top" data-testid="removed-attachments-section">
                      <h6 className="fw-bold small text-muted mb-2">Removed Attachment History</h6>
                      <ul className="list-unstyled mb-0 small">
                        {removedAttachments.map((att) => (
                          <li key={att.id} className="text-muted mb-2 ps-2 border-start border-2 border-danger">
                            <del>{att.originalName}</del>
                            <div style={{ fontSize: '0.75rem' }}>
                              Reason: <em>{att.removalReason || 'Not specified'}</em>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Comments Placeholder for Issue 4 */}
              {activeTab === 'comments' && (
                <div className="py-4 text-center text-muted" data-testid="comments-tab-pane">
                  <div className="fs-3 mb-2">💬</div>
                  <h6 className="fw-semibold">Public Comments Thread</h6>
                  <p className="small mb-0">Collaborative comments with requester will be enabled in Issue 4.</p>
                </div>
              )}

              {/* Notes Placeholder for Issue 4 */}
              {activeTab === 'notes' && (
                <div className="py-4 text-center text-warning" data-testid="notes-tab-pane">
                  <div className="fs-3 mb-2">🔒</div>
                  <h6 className="fw-semibold text-dark">Confidential Internal Notes</h6>
                  <p className="small text-muted mb-0">Private internal notes for IT Staff & Admin will be enabled in Issue 4.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Status Confirmation Modal */}
      {isConfirmingTerminal && pendingStatus && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(3px)', zIndex: 1060 }}
          data-testid="terminal-status-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  ⚠️ Confirm Terminal Status Transition
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setIsConfirmingTerminal(false);
                    setPendingStatus(null);
                  }}
                ></button>
              </div>
              <div className="modal-body py-3">
                <p className="small mb-3">
                  You are about to transition ticket <strong>#{ticket.ticketNumber}</strong> to status{' '}
                  <span className="badge bg-dark">{pendingStatus}</span>.
                </p>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Resolution / Closure Reason (Optional)</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={3}
                    placeholder="Enter reason or summary of actions taken..."
                    value={terminalReason}
                    onChange={(e) => setTerminalReason(e.target.value)}
                    data-testid="terminal-reason-input"
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer border-top-0 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setIsConfirmingTerminal(false);
                    setPendingStatus(null);
                  }}
                  data-testid="cancel-terminal-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm fw-bold"
                  onClick={() => executeStatusTransition(pendingStatus, terminalReason)}
                  data-testid="confirm-terminal-btn"
                >
                  Confirm & Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

