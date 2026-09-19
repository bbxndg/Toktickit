import React, { useState, useEffect, useCallback } from 'react';
import { useRequester } from '../context/RequesterContext';
import { useAuth } from '../context/AuthContext';

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

interface CommentItem {
  id: number;
  ticketId: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    email: string;
    role: string;
    department?: string;
  };
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
  let auth: any = null;
  try {
    auth = useAuth();
  } catch {}
  const token = auth?.token;

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

  // Public Comments State
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Problem Appears Resolved State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [resolveSuccessMsg, setResolveSuccessMsg] = useState('');

  const fetchTicket = useCallback(async () => {
    if (!currentRequester && !token) return;
    setLoading(true);
    setError('');
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const queryParam = currentRequester ? `?requesterId=${currentRequester.id}` : '';
      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}${queryParam}`, {
        headers,
      });

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
  }, [ticketId, currentRequester, token]);

  const fetchComments = useCallback(async () => {
    try {
      setLoadingComments(true);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/comments`, {
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      } else {
        setComments([]);
      }
    } catch (err) {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [ticketId, token]);

  useEffect(() => {
    fetchTicket();
    if (token) {
      fetchComments();
    }
  }, [fetchTicket, fetchComments, token]);

  // ── Post Public Comment ──────────────────────────────────────────────────
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (trimmed.length < 2 || trimmed.length > 2000) {
      setCommentError('Comment must be between 2 and 2,000 characters.');
      return;
    }
    setCommentError('');
    setPostingComment(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to post comment.');
      }

      const created = await res.json();
      setComments((prev) => [...prev, created]);
      setNewComment('');
    } catch (err: any) {
      setCommentError(err.message || 'Failed to post comment.');
    } finally {
      setPostingComment(false);
    }
  };

  // ── Problem Appears Resolved (BR-11) ─────────────────────────────────────
  const handleIndicateResolved = async () => {
    setResolving(true);
    setResolveError('');
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/indicate-resolved`, {
        method: 'PATCH',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to indicate resolution.');
      }

      const updated = await res.json();
      setTicket((prev) => (prev ? { ...prev, status: updated.status } : null));
      setResolveModalOpen(false);
      setResolveSuccessMsg('Thank you! Your ticket status has been updated to Resolved.');
      setTimeout(() => setResolveSuccessMsg(''), 5000);
    } catch (err: any) {
      setResolveError(err.message || 'Failed to update ticket status.');
    } finally {
      setResolving(false);
    }
  };

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
    if (s === 'WAITING_FOR_REQUESTER') cls = 'badge bg-secondary text-white';
    if (s === 'RESOLVED') cls = 'badge-zg-status-resolved';
    if (s === 'CLOSED') cls = 'badge-zg-status-closed';
    if (s === 'CANCELLED') cls = 'badge bg-danger text-white';
    if (s === 'REOPENED') cls = 'badge bg-warning text-dark';
    return <span className={`badge ${cls} px-2 py-1`}>{st.replace(/_/g, ' ')}</span>;
  };

  // ── Date Formatter ────────────────────────────────────────────────────────
  const fmt = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Soft Removal Modal Handlers ──────────────────────────────────────────
  const openRemoveModal = (att: AttachmentItem) => {
    setRemovalTarget(att);
    setRemovalReason('');
    setRemovalReasonError('');
    setRemoveModalOpen(true);
  };

  const closeRemoveModal = () => {
    if (removing) return;
    setRemoveModalOpen(false);
    setRemovalTarget(null);
    setRemovalReason('');
    setRemovalReasonError('');
  };

  const handleConfirmRemove = async () => {
    if (removalReason.trim().length < 3) {
      setRemovalReasonError('Removal reason must be at least 3 characters.');
      return;
    }
    if (!removalTarget || !currentRequester) return;

    setRemoving(true);
    setRemovalReasonError('');
    try {
      const res = await fetch(
        `${API_BASE}/api/attachments/${removalTarget.id}?requesterId=${currentRequester.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ reason: removalReason.trim() }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setRemovalReasonError(data.error?.message || 'Failed to remove attachment.');
        return;
      }

      await fetchTicket();
      closeRemoveModal();
    } catch (err: any) {
      setRemovalReasonError('Network error: Could not remove attachment.');
    } finally {
      setRemoving(false);
    }
  };

  // ── Add Attachment Handler ───────────────────────────────────────────────
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  const handleAddAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentRequester) return;

    setAddAttachError('');

    // Check 5 active limit
    const activeCount = ticket?.attachments?.filter((a) => !a.isRemoved).length || 0;
    if (activeCount >= 5) {
      setAddAttachError('Maximum limit of 5 active attachments reached.');
      e.target.value = '';
      return;
    }

    // Client-side file type validation
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type);
    const isExtValid = ALLOWED_EXTENSIONS.includes(ext);

    if (!isMimeValid && !isExtValid) {
      setAddAttachError('Invalid file type. Only JPG, PNG, WEBP, and PDF are allowed.');
      e.target.value = '';
      return;
    }

    // Client-side file size validation
    if (file.size > MAX_FILE_SIZE) {
      setAddAttachError('File size exceeds the 5 MB limit.');
      e.target.value = '';
      return;
    }

    setAddingAttachment(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(
        `${API_BASE}/api/tickets/${ticketId}/attachments?requesterId=${currentRequester.id}`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setAddAttachError(data.error?.message || 'Failed to upload attachment.');
        return;
      }

      await fetchTicket();
      e.target.value = '';
    } catch (err: any) {
      setAddAttachError('Network error: Could not upload attachment.');
    } finally {
      setAddingAttachment(false);
    }
  };

  // ── Render: Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container py-5 text-center" data-testid="ticket-detail-loading">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading ticket...</span>
        </div>
        <p className="mt-2 text-muted">Loading ticket details...</p>
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
    <div className="container py-2" style={{ maxWidth: '900px' }} data-testid="requester-ticket-detail-container">
      {/* Header Row */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3">
        <div>
          <h2 className="h4 fw-bold mb-1" style={{ color: 'var(--zg-text-primary)' }}>
            Ticket Detail
          </h2>
          <p className="text-muted small mb-0">Read-only view of your submitted ticket.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {/* Problem Appears Resolved Action Button (BR-11, FR-08) */}
          {(ticket.status === 'IN_PROGRESS' || ticket.status === 'WAITING_FOR_REQUESTER') && (
            <button
              type="button"
              className="btn btn-sm btn-success text-nowrap fw-bold"
              onClick={() => setResolveModalOpen(true)}
              data-testid="indicate-resolved-btn"
            >
              ✅ Problem Appears Resolved
            </button>
          )}
          <button type="button" className="btn btn-sm btn-zg-secondary text-nowrap" onClick={onBack}>
            ← Back to My Tickets
          </button>
        </div>
      </div>

      {/* Success Toast / Notification */}
      {resolveSuccessMsg && (
        <div className="alert alert-success py-2 small mb-3 shadow-sm d-flex justify-content-between align-items-center" role="alert">
          <span>{resolveSuccessMsg}</span>
          <button type="button" className="btn-close btn-sm" onClick={() => setResolveSuccessMsg('')}></button>
        </div>
      )}

      {/* Ticket Header Card (Read-Only) */}
      <div className="zg-card p-3 p-md-4 shadow-sm mb-4">
        <div
          className="row g-3 mb-4 p-3 rounded"
          style={{ backgroundColor: 'var(--zg-bg)' }}
          data-testid="ticket-header"
        >
          <div className="col-12 col-md-4">
            <label className="zg-label">Ticket Number</label>
            <p className="fw-bold font-monospace mb-0" style={{ color: 'var(--zg-primary)' }}>
              {ticket.ticketNumber}
            </p>
          </div>
          <div className="col-12 col-md-4">
            <label className="zg-label">Ticket Date</label>
            <p className="mb-0 text-dark">{fmt(ticket.createdAt)}</p>
          </div>
          <div className="col-12 col-md-4">
            <label className="zg-label">Requester</label>
            <p className="mb-0 fw-semibold text-dark">{ticket.requester.name}</p>
            <small className="text-muted">{ticket.requester.department}</small>
          </div>
        </div>

        {/* Classification Row */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <label className="zg-label">Category</label>
            <p className="mb-0">{ticket.category.name}</p>
          </div>
          <div className="col-12 col-md-4">
            <label className="zg-label">Related System</label>
            <p className="mb-0">{ticket.relatedSystem.name}</p>
          </div>
          <div className="col-12 col-md-4">
            <label className="zg-label">Status</label>
            <div className="mt-1">{renderStatusBadge(ticket.status)}</div>
          </div>
        </div>

        {/* Priority Row */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <label className="zg-label">Requested Priority</label>
            <div className="mt-1">{renderPriorityBadge(ticket.requestedPriority)}</div>
          </div>
          <div className="col-12 col-md-4">
            <label className="zg-label">IT Priority</label>
            <div className="mt-1">{renderPriorityBadge(ticket.itPriority)}</div>
          </div>
          <div className="col-12 col-md-4">
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
                    className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 px-0 py-2"
                    data-testid={`attachment-item-${att.id}`}
                  >
                    <div className="d-flex align-items-center gap-2 text-truncate me-2 w-100 w-sm-auto">
                      <span>📄</span>
                      <div className="text-truncate">
                        <span className="fw-medium text-dark">{att.originalName}</span>
                        <small className="text-muted d-block">
                          {formatFileSize(att.sizeBytes)} · Uploaded {fmt(att.createdAt)}
                        </small>
                      </div>
                    </div>
                    <div className="d-flex gap-2 flex-shrink-0 align-self-end align-self-sm-center">
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

      {/* Public Comments Section (AC-08, BR-12) */}
      <div className="zg-card p-4 shadow-sm mb-4" data-testid="public-comments-section">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0 text-success">
            💬 Conversation with IT Support
            <span className="badge bg-secondary ms-2 fw-normal" style={{ fontSize: '0.75rem' }}>
              {Array.isArray(comments) ? comments.length : 0}
            </span>
          </h5>
          <small className="text-muted" style={{ fontSize: '0.75rem' }}>Public conversation</small>
        </div>

        {loadingComments ? (
          <div className="py-3 text-center text-muted small">Loading conversation...</div>
        ) : !Array.isArray(comments) || comments.length === 0 ? (
          <p className="text-muted small py-2 mb-3">No messages yet. Send a message to IT support below.</p>
        ) : (
          <div className="comment-list mb-3" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {comments.map((c) => (
              <div
                key={c.id}
                className="card border-0 bg-light p-3 mb-2 rounded"
                data-testid={`public-comment-item-${c.id}`}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div>
                    <strong className="small text-dark">{c.author.name}</strong>
                    <span
                      className={`badge ms-1 ${
                        c.author.role === 'ADMINISTRATOR'
                          ? 'bg-danger'
                          : c.author.role === 'IT_STAFF'
                          ? 'bg-primary'
                          : 'bg-secondary'
                      }`}
                      style={{ fontSize: '0.65rem' }}
                    >
                      {c.author.role === 'ADMINISTRATOR' ? 'Admin' : c.author.role === 'IT_STAFF' ? 'IT Staff' : 'Requester'}
                    </span>
                  </div>
                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                    {fmt(c.createdAt)}
                  </small>
                </div>
                <p className="small mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                  {c.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Post Comment Input */}
        <form onSubmit={handlePostComment} className="pt-2 border-top">
          {commentError && (
            <div className="alert alert-danger py-1 small mb-2">{commentError}</div>
          )}
          <div className="mb-2">
            <textarea
              className="form-control form-control-sm"
              rows={3}
              placeholder="Type your message or reply to IT Staff..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={postingComment}
              maxLength={2000}
              data-testid="requester-comment-input"
            ></textarea>
            <div className="d-flex justify-content-between align-items-center mt-2">
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                {newComment.length} / 2,000 characters
              </small>
              <button
                type="submit"
                className="btn btn-success btn-sm px-3"
                disabled={postingComment || newComment.trim().length < 2}
                data-testid="post-comment-btn"
              >
                {postingComment ? 'Posting...' : '📨 Post Public Comment'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Soft-Removal Confirmation Modal */}
      {removeModalOpen && removalTarget && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          data-testid="remove-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">Remove Attachment</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeRemoveModal}
                  disabled={removing}
                />
              </div>
              <div className="modal-body">
                <p className="small text-muted mb-2">
                  You are about to remove <strong>{removalTarget.originalName}</strong>. Please provide a reason for removal.
                </p>
                <div className="mb-3">
                  <label htmlFor="removal-reason" className="form-label small fw-semibold">
                    Removal Reason <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="removal-reason"
                    data-testid="removal-reason-input"
                    className={`form-control ${removalReasonError ? 'is-invalid' : ''}`}
                    rows={3}
                    placeholder="E.g., File contains sensitive information or was uploaded in error"
                    value={removalReason}
                    onChange={(e) => {
                      setRemovalReason(e.target.value);
                      if (removalReasonError) setRemovalReasonError('');
                    }}
                    disabled={removing}
                  />
                  {removalReasonError && (
                    <div className="invalid-feedback d-block" data-testid="removal-reason-error">
                      {removalReasonError}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={closeRemoveModal}
                  disabled={removing}
                  data-testid="cancel-remove-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={handleConfirmRemove}
                  disabled={removing}
                  data-testid="confirm-remove-btn"
                >
                  {removing ? 'Removing...' : 'Confirm Removal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Problem Appears Resolved Confirmation Modal */}
      {resolveModalOpen && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(3px)' }}
          data-testid="confirm-resolve-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-success">
                  ✅ Confirm Issue Resolution
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setResolveModalOpen(false)}
                  disabled={resolving}
                ></button>
              </div>
              <div className="modal-body py-3">
                <p className="small mb-2">
                  Are you sure your issue has been resolved?
                </p>
                <p className="small text-muted mb-0">
                  This will transition ticket <strong>#{ticket.ticketNumber}</strong> to <strong>Resolved</strong> status and notify the IT support team.
                </p>
                {resolveError && (
                  <div className="alert alert-danger py-2 small mt-3 mb-0">{resolveError}</div>
                )}
              </div>
              <div className="modal-footer border-top-0 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setResolveModalOpen(false)}
                  disabled={resolving}
                  data-testid="cancel-resolve-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm fw-bold px-3"
                  onClick={handleIndicateResolved}
                  disabled={resolving}
                  data-testid="confirm-resolve-btn"
                >
                  {resolving ? 'Updating...' : 'Yes, Problem Is Resolved'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
