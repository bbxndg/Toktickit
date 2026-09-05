import React, { useState, useEffect, useCallback } from 'react';
import { useRequester } from '../context/RequesterContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

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

interface TicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: string;
  itPriority: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  requesterId: number;
  requester: { id: number; name: string; email: string; department: string };
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  attachments: AttachmentItem[];
}

interface TicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticketId, onBack }) => {
  const { currentRequester } = useRequester();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Remove Modal State
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removalTarget, setRemovalTarget] = useState<AttachmentItem | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [removalReasonError, setRemovalReasonError] = useState('');
  const [removing, setRemoving] = useState(false);

  // Add Attachment State
  const [addingAttachment, setAddingAttachment] = useState(false);
  const [addAttachError, setAddAttachError] = useState('');

  const fetchTicket = useCallback(async () => {
    if (!currentRequester) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/api/tickets/${ticketId}?requesterId=${currentRequester.id}`
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || `Error ${res.status}`);
        setTicket(null);
        return;
      }
      const data = await res.json();
      setTicket(data);
    } catch (err: any) {
      setError('Network error: Could not load ticket details.');
    } finally {
      setLoading(false);
    }
  }, [ticketId, currentRequester]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // ── Priority Badge ───────────────────────────────────────────────────────
  const renderPriorityBadge = (prio: string | null) => {
    if (!prio) return <span className="text-muted small">—</span>;
    const p = prio.toUpperCase();
    let cls = 'badge-zg-priority-low';
    if (p === 'MEDIUM') cls = 'badge-zg-priority-medium';
    if (p === 'HIGH') cls = 'badge-zg-priority-high';
    if (p === 'CRITICAL') cls = 'badge-zg-priority-critical';
    return <span className={`badge ${cls} px-2 py-1`}>{prio}</span>;
  };

  // ── Status Badge ─────────────────────────────────────────────────────────
  const renderStatusBadge = (st: string) => {
    const s = st.toUpperCase();
    let cls = 'badge-zg-status-new';
    if (s === 'OPEN') cls = 'badge bg-info text-dark';
    if (s === 'IN_PROGRESS') cls = 'badge-zg-status-inprogress';
    if (s === 'RESOLVED') cls = 'badge-zg-status-resolved';
    if (s === 'CLOSED') cls = 'badge bg-secondary';
    return <span className={`badge ${cls} px-2 py-1`}>{st.replace('_', ' ')}</span>;
  };

  // ── Format date ──────────────────────────────────────────────────────────
  const fmt = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', hour12: true,
      }).format(new Date(iso));
    } catch { return iso; }
  };

  // ── Soft Remove Handler ──────────────────────────────────────────────────
  const openRemoveModal = (att: AttachmentItem) => {
    setRemovalTarget(att);
    setRemovalReason('');
    setRemovalReasonError('');
    setRemoveModalOpen(true);
  };

  const closeRemoveModal = () => {
    setRemoveModalOpen(false);
    setRemovalTarget(null);
    setRemovalReason('');
    setRemovalReasonError('');
  };

  const handleRemove = async () => {
    if (!removalTarget || !currentRequester) return;

    const trimmed = removalReason.trim();
    if (trimmed.length < 3) {
      setRemovalReasonError('Removal reason must be at least 3 characters.');
      return;
    }

    setRemoving(true);
    try {
      const res = await fetch(`${API_BASE}/api/attachments/${removalTarget.id}/remove`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: currentRequester.id, removalReason: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        setRemovalReasonError(data.error?.message || 'Failed to remove attachment.');
        return;
      }

      closeRemoveModal();
      fetchTicket(); // Refresh ticket data
    } catch {
      setRemovalReasonError('Network error. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  // ── Add Attachment Handler ───────────────────────────────────────────────
  const handleAddAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentRequester) return;
    const file = e.target.files[0];
    e.target.value = '';

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setAddAttachError(`Invalid file type. Only JPG, PNG, WEBP, and PDF are allowed.`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAddAttachError(`File "${file.name}" exceeds the 5 MB limit.`);
      return;
    }

    setAddingAttachment(true);
    setAddAttachError('');
    try {
      const formData = new FormData();
      formData.append('requesterId', String(currentRequester.id));
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setAddAttachError(data.error?.message || 'Failed to upload attachment.');
        return;
      }

      fetchTicket(); // Refresh to show new attachment
    } catch {
      setAddAttachError('Network error. Please try again.');
    } finally {
      setAddingAttachment(false);
    }
  };

  // ── Render: Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="zg-card p-5 text-center shadow-sm">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted small">Loading ticket details...</p>
      </div>
    );
  }

  // ── Render: Error ────────────────────────────────────────────────────────
  if (error || !ticket) {
    return (
      <div className="zg-card p-4 shadow-sm">
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error || 'Ticket not found.'}
        </div>
        <button type="button" className="btn btn-zg-secondary" onClick={onBack}>
          ← Back to My Tickets
        </button>
      </div>
    );
  }

  const activeAttachments = ticket.attachments.filter((a) => !a.isRemoved);
  const removedAttachments = ticket.attachments.filter((a) => a.isRemoved);
  const canAddMore = activeAttachments.length < 5;

  // ── Render: Main ─────────────────────────────────────────────────────────
  return (
    <div className="container py-2" style={{ maxWidth: '900px' }}>
      {/* Header Row */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="h4 fw-bold mb-1" style={{ color: 'var(--zg-text-primary)' }}>
            Ticket Detail
          </h2>
          <p className="text-muted small mb-0">Read-only view of your submitted ticket.</p>
        </div>
        <button type="button" className="btn btn-sm btn-zg-secondary" onClick={onBack}>
          ← Back to My Tickets
        </button>
      </div>

      {/* Ticket Header Card (Read-Only) */}
      <div className="zg-card p-4 shadow-sm mb-4">
        <div
          className="row g-3 mb-4 p-3 rounded"
          style={{ backgroundColor: 'var(--zg-bg)' }}
          data-testid="ticket-header"
        >
          <div className="col-md-4">
            <label className="zg-label">Ticket Number</label>
            <p className="fw-bold font-monospace mb-0" style={{ color: 'var(--zg-primary)' }}>
              {ticket.ticketNumber}
            </p>
          </div>
          <div className="col-md-4">
            <label className="zg-label">Ticket Date</label>
            <p className="mb-0 text-dark">{fmt(ticket.createdAt)}</p>
          </div>
          <div className="col-md-4">
            <label className="zg-label">Requester</label>
            <p className="mb-0 fw-semibold text-dark">{ticket.requester.name}</p>
            <small className="text-muted">{ticket.requester.department}</small>
          </div>
        </div>

        {/* Classification Row */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <label className="zg-label">Category</label>
            <p className="mb-0">{ticket.category.name}</p>
          </div>
          <div className="col-md-4">
            <label className="zg-label">Related System</label>
            <p className="mb-0">{ticket.relatedSystem.name}</p>
          </div>
          <div className="col-md-4">
            <label className="zg-label">Status</label>
            <div className="mt-1">{renderStatusBadge(ticket.status)}</div>
          </div>
        </div>

        {/* Priority Row */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <label className="zg-label">Requested Priority</label>
            <div className="mt-1">{renderPriorityBadge(ticket.requestedPriority)}</div>
          </div>
          <div className="col-md-4">
            <label className="zg-label">IT Priority</label>
            <div className="mt-1">{renderPriorityBadge(ticket.itPriority)}</div>
          </div>
          <div className="col-md-4">
            <label className="zg-label">Last Updated</label>
            <p className="mb-0 small text-muted">{fmt(ticket.updatedAt)}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-4">
          <label className="zg-label">Summary</label>
          <p className="mb-0 fw-semibold">{ticket.summary}</p>
        </div>

        {/* Description */}
        <div>
          <label className="zg-label">Description</label>
          <div
            className="p-3 rounded"
            style={{ backgroundColor: 'var(--zg-bg)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
          >
            {ticket.description}
          </div>
        </div>
      </div>

      {/* Attachments Card */}
      <div className="zg-card p-4 shadow-sm mb-4" data-testid="attachments-section">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0" style={{ color: 'var(--zg-text-primary)' }}>
            Attachments
            <span className="badge bg-secondary ms-2 fw-normal" style={{ fontSize: '0.75rem' }}>
              {activeAttachments.length} active / 5
            </span>
          </h5>
          <div>
            {/* Hidden file input */}
            <input
              type="file"
              id="add-attachment-input"
              data-testid="add-attachment-input"
              className="d-none"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={handleAddAttachment}
              disabled={!canAddMore || addingAttachment}
            />
            <label
              htmlFor="add-attachment-input"
              className={`btn btn-sm ${canAddMore ? 'btn-zg-secondary' : 'btn-outline-secondary'}`}
              style={{ cursor: canAddMore ? 'pointer' : 'not-allowed', opacity: canAddMore ? 1 : 0.5 }}
              data-testid="add-attachment-btn"
              title={!canAddMore ? 'Maximum 5 active attachments reached.' : 'Add a new attachment'}
            >
              {addingAttachment ? (
                <><span className="spinner-border spinner-border-sm me-1" role="status" />Uploading...</>
              ) : (
                '📎 Add Attachment'
              )}
            </label>
          </div>
        </div>

        {!canAddMore && (
          <div className="alert alert-info py-2 small mb-3" data-testid="attachment-limit-msg">
            This ticket has reached the maximum of 5 active attachments.
          </div>
        )}

        {addAttachError && (
          <div className="alert alert-danger py-2 small mb-3" data-testid="add-attach-error">
            {addAttachError}
          </div>
        )}

        {/* Active Attachments List */}
        {activeAttachments.length === 0 && removedAttachments.length === 0 ? (
          <p className="text-muted small mb-0">No attachments have been added to this ticket.</p>
        ) : (
          <>
            {activeAttachments.length > 0 && (
              <ul className="list-group list-group-flush mb-3">
                {activeAttachments.map((att) => (
                  <li
                    key={att.id}
                    className="list-group-item d-flex justify-content-between align-items-center px-0"
                    data-testid={`attachment-item-${att.id}`}
                  >
                    <div className="d-flex align-items-center gap-2 text-truncate me-2">
                      <span>📄</span>
                      <div className="text-truncate">
                        <span className="fw-medium text-dark">{att.originalName}</span>
                        <small className="text-muted d-block">
                          {(att.sizeBytes / 1024).toFixed(1)} KB · Uploaded {fmt(att.createdAt)}
                        </small>
                      </div>
                    </div>
                    <div className="d-flex gap-2 flex-shrink-0">
                      <a
                        href={`${API_BASE}/api/attachments/${att.id}/download?requesterId=${currentRequester?.id}`}
                        className="btn btn-sm btn-zg-secondary"
                        download={att.originalName}
                        data-testid={`download-btn-${att.id}`}
                      >
                        ⬇️ Download
                      </a>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => openRemoveModal(att)}
                        data-testid={`remove-btn-${att.id}`}
                      >
                        🗑 Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Removed Attachments History */}
            {removedAttachments.length > 0 && (
              <div className="mt-3">
                <h6 className="text-muted fw-semibold mb-2" style={{ fontSize: '0.8rem' }}>
                  REMOVED ATTACHMENT HISTORY
                </h6>
                <ul className="list-group list-group-flush">
                  {removedAttachments.map((att) => (
                    <li
                      key={att.id}
                      className="list-group-item px-0"
                      data-testid={`removed-attachment-${att.id}`}
                    >
                      <div className="d-flex align-items-start gap-2">
                        <span className="text-muted">🚫</span>
                        <div>
                          <span className="text-muted text-decoration-line-through">{att.originalName}</span>
                          <small className="text-muted d-block">
                            Removed {att.removedAt ? fmt(att.removedAt) : '—'}
                          </small>
                          {att.removalReason && (
                            <small className="text-muted fst-italic d-block">
                              Reason: {att.removalReason}
                            </small>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Soft Remove Modal ─────────────────────────────────────────────── */}
      {removeModalOpen && removalTarget && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          data-testid="remove-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold" style={{ color: 'var(--zg-text-primary)' }}>
                  Remove Attachment
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeRemoveModal}
                  disabled={removing}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">
                  You are about to remove{' '}
                  <strong>{removalTarget.originalName}</strong>. This action cannot be undone — the
                  file metadata will be preserved in the history for audit purposes.
                </p>
                <label htmlFor="removal-reason-input" className="zg-label">
                  Removal Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  id="removal-reason-input"
                  rows={3}
                  className={`form-control zg-input ${removalReasonError ? 'is-invalid' : ''}`}
                  placeholder="Explain why this attachment is being removed..."
                  value={removalReason}
                  onChange={(e) => {
                    setRemovalReason(e.target.value);
                    if (removalReasonError) setRemovalReasonError('');
                  }}
                  data-testid="removal-reason-input"
                />
                {removalReasonError && (
                  <span className="zg-error-text" data-testid="removal-reason-error">
                    {removalReasonError}
                  </span>
                )}
              </div>
              <div className="modal-footer border-0">
                <button
                  type="button"
                  className="btn btn-zg-secondary"
                  onClick={closeRemoveModal}
                  disabled={removing}
                  data-testid="cancel-remove-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleRemove}
                  disabled={removing}
                  data-testid="confirm-remove-btn"
                >
                  {removing ? (
                    <><span className="spinner-border spinner-border-sm me-1" role="status" />Removing...</>
                  ) : (
                    'Confirm Remove'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
