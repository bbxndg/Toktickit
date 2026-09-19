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

interface NoteItem {
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

  // Active Tab: attachments, comments, notes
  const [activeTab, setActiveTab] = useState<'attachments' | 'comments' | 'notes'>('attachments');

  // Collaboration state
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newNote, setNewNote] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [postingNote, setPostingNote] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [noteError, setNoteError] = useState('');

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

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      setLoadingComments(true);
      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/comments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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

  // Fetch internal notes
  const fetchNotes = useCallback(async () => {
    try {
      setLoadingNotes(true);
      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/notes`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(Array.isArray(data) ? data : []);
      } else {
        setNotes([]);
      }
    } catch (err) {
      setNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  }, [ticketId, token]);

  // Load initial data
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
    fetchComments();
    fetchNotes();
  }, [fetchTicket, fetchComments, fetchNotes, token]);

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

  // Reassign Owner
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
        throw new Error(data.error?.message || 'Status transition failed.');
      }

      const updated = await res.json();
      setTicket((prev) => (prev ? { ...prev, status: updated.status } : null));
      setSelectedStatus(updated.status);
      setIsConfirmingTerminal(false);
      setPendingStatus(null);
      showToast('success', `Ticket status updated to ${updated.status}.`);
    } catch (err: any) {
      showToast('danger', err.message);
      setSelectedStatus(ticket.status);
      setIsConfirmingTerminal(false);
      setPendingStatus(null);
    }
  };

  // Post Public Comment
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
      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to post comment.');
      }

      const created = await res.json();
      setComments((prev) => [...prev, created]);
      setNewComment('');
      showToast('success', 'Public comment posted successfully.');
    } catch (err: any) {
      setCommentError(err.message || 'Failed to post comment.');
    } finally {
      setPostingComment(false);
    }
  };

  // Save Internal Note
  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newNote.trim();
    if (trimmed.length < 2 || trimmed.length > 2000) {
      setNoteError('Internal note must be between 2 and 2,000 characters.');
      return;
    }
    setNoteError('');
    setPostingNote(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to save internal note.');
      }

      const created = await res.json();
      setNotes((prev) => [...prev, created]);
      setNewNote('');
      showToast('success', 'Internal note saved securely.');
    } catch (err: any) {
      setNoteError(err.message || 'Failed to save internal note.');
    } finally {
      setPostingNote(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
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

  const renderStatusBadge = (st: string) => {
    const s = st.toUpperCase();
    let bg = 'bg-secondary';
    if (s === 'NEW') bg = 'bg-primary';
    if (s === 'OPEN') bg = 'bg-info text-dark';
    if (s === 'IN_PROGRESS') bg = 'bg-warning text-dark';
    if (s === 'WAITING_FOR_REQUESTER') bg = 'bg-secondary text-white';
    if (s === 'RESOLVED') bg = 'bg-success text-white';
    if (s === 'CLOSED') bg = 'bg-dark text-white';
    if (s === 'CANCELLED') bg = 'bg-danger text-white';
    if (s === 'REOPENED') bg = 'bg-warning text-dark';

    return <span className={`badge ${bg} px-2 py-1`}>{st.replace(/_/g, ' ')}</span>;
  };

  const renderPriorityBadge = (prio: string | null) => {
    if (!prio) return <span className="text-muted small">—</span>;
    const p = prio.toUpperCase();
    let cls = 'bg-secondary';
    if (p === 'LOW') cls = 'bg-secondary';
    if (p === 'MEDIUM') cls = 'bg-info text-dark';
    if (p === 'HIGH') cls = 'bg-warning text-dark';
    if (p === 'CRITICAL') cls = 'bg-danger';

    return <span className={`badge ${cls} px-2 py-1`}>{prio}</span>;
  };

  const renderRoleBadge = (role: string) => {
    if (role === 'ADMINISTRATOR') {
      return <span className="badge bg-danger ms-1" style={{ fontSize: '0.65rem' }}>Admin</span>;
    }
    if (role === 'IT_STAFF') {
      return <span className="badge bg-primary ms-1" style={{ fontSize: '0.65rem' }}>IT Staff</span>;
    }
    return <span className="badge bg-secondary ms-1" style={{ fontSize: '0.65rem' }}>Requester</span>;
  };

  if (loading) {
    return (
      <div className="py-5 text-center text-muted" data-testid="staff-ticket-loading">
        <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
        Loading ticket operational view...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="card shadow-sm border-0 p-4 bg-white" data-testid="staff-ticket-error">
        <div className="alert alert-danger mb-3" role="alert">
          {error || 'Ticket not found.'}
        </div>
        <div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
            ← Back to Queue
          </button>
        </div>
      </div>
    );
  }

  const activeAttachments = ticket.attachments.filter((a) => !a.isRemoved);
  const removedAttachments = ticket.attachments.filter((a) => a.isRemoved);
  const permittedNextStatuses = PERMITTED_STATUS_TRANSITIONS[ticket.status] || [];

  return (
    <div className="staff-ticket-detail-view" data-testid="staff-ticket-detail-container">
      {/* Header & Breadcrumb */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
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
              <span>
                Ticket Owner{' '}
                {ticket.owner && ticket.owner.id === user?.id && (
                  <span className="badge bg-success-subtle text-success border border-success-subtle ms-1" style={{ fontSize: '0.7rem' }}>
                    Assigned to You
                  </span>
                )}
              </span>
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
              Status Transition
            </label>
            <select
              className="form-select form-select-sm"
              value={selectedStatus}
              onChange={(e) => handleStatusChangeSelect(e.target.value)}
              disabled={permittedNextStatuses.length === 0}
              data-testid="status-transition-select"
            >
              <option value={ticket.status}>{ticket.status.replace(/_/g, ' ')} (Current)</option>
              {permittedNextStatuses.map((st) => (
                <option key={st} value={st}>
                  ➔ {st.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Ticket Details (Left) + Interaction Tabs (Right) */}
      <div className="row g-4">
        {/* Left Column: Read-only Ticket Info */}
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm border-0 bg-white p-3 p-md-4 mb-3" data-testid="ticket-details-card">
            {/* Ticket Identifier Header */}
            <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
              <div>
                <span className="badge bg-light text-muted font-monospace mb-1">{ticket.ticketNumber}</span>
                <h5 className="fw-bold mb-0 text-dark">{ticket.summary}</h5>
              </div>
              <div>{renderStatusBadge(ticket.status)}</div>
            </div>

            {/* Requester & System Metadata */}
            <div className="row g-3 mb-3">
              <div className="col-6 col-sm-4">
                <label className="text-muted small fw-bold d-block">Requester</label>
                <span className="fw-semibold small text-dark d-block">{ticket.requester.name}</span>
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {ticket.requester.department || ticket.requester.email}
                </small>
              </div>

              <div className="col-6 col-sm-4">
                <label className="text-muted small fw-bold d-block">Category</label>
                <span className="small text-dark">{ticket.category.name}</span>
              </div>

              <div className="col-6 col-sm-4">
                <label className="text-muted small fw-bold d-block">Related System</label>
                <span className="small text-dark">{ticket.relatedSystem.name}</span>
              </div>

              <div className="col-6 col-sm-4">
                <label className="text-muted small fw-bold d-block">Requested Priority</label>
                <div>{renderPriorityBadge(ticket.requestedPriority)}</div>
              </div>

              <div className="col-6 col-sm-4">
                <label className="text-muted small fw-bold d-block">IT Priority</label>
                <div>{renderPriorityBadge(ticket.itPriority)}</div>
              </div>

              <div className="col-6 col-sm-4">
                <label className="text-muted small fw-bold d-block">Assigned Owner</label>
                <span className="small text-dark">
                  {ticket.owner ? `${ticket.owner.name}` : <em className="text-muted">Unassigned</em>}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-3">
              <label className="text-muted small fw-bold d-block mb-1">Description</label>
              <div
                className="p-3 rounded bg-light small"
                style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', minHeight: '80px' }}
                data-testid="ticket-description-box"
              >
                {ticket.description}
              </div>
            </div>

            {/* Timestamps */}
            <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
              <div>
                <span>Created: </span>
                <span>{formatDate(ticket.createdAt)}</span>
              </div>
              <div>
                <span>Updated: </span>
                <span>{formatDate(ticket.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interaction Tabs (Attachments + Comments + Internal Notes) */}
        <div className="col-12 col-lg-5">
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-header bg-white border-bottom-0 pb-0 pt-3">
              <ul className="nav nav-tabs card-header-tabs" role="tablist">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 'attachments' ? 'active fw-bold text-success' : 'text-muted'}`}
                    onClick={() => setActiveTab('attachments')}
                    data-testid="tab-attachments-btn"
                  >
                    📎 Attachments ({activeAttachments.length})
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 'comments' ? 'active fw-bold text-success' : 'text-muted'}`}
                    onClick={() => setActiveTab('comments')}
                    data-testid="tab-comments-btn"
                  >
                    💬 Public Comments ({comments.length})
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 'notes' ? 'active fw-bold text-warning' : 'text-muted'}`}
                    onClick={() => setActiveTab('notes')}
                    data-testid="tab-notes-btn"
                  >
                    🔒 Internal Notes ({notes.length})
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
                            href={`${API_BASE}/api/attachments/${att.id}/download?token=${token || ''}`}
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

              {/* Public Comments Tab */}
              {activeTab === 'comments' && (
                <div data-testid="comments-tab-pane">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold small mb-0 text-success">Public Conversation Thread</h6>
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>Visible to Requester & Staff</small>
                  </div>

                  {loadingComments ? (
                    <div className="py-3 text-center text-muted small">Loading conversation...</div>
                  ) : comments.length === 0 ? (
                    <p className="text-muted small py-3 text-center mb-0">No public comments on this ticket yet.</p>
                  ) : (
                    <div className="comment-list mb-3" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {comments.map((c) => (
                        <div
                          key={c.id}
                          className="card border-0 bg-light p-2 mb-2 rounded"
                          data-testid={`public-comment-item-${c.id}`}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <div>
                              <strong className="small text-dark">{c.author.name}</strong>
                              {renderRoleBadge(c.author.role)}
                            </div>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {formatDate(c.createdAt)}
                            </small>
                          </div>
                          <p className="small mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                            {c.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Post Comment Form */}
                  <form onSubmit={handlePostComment} className="mt-3 pt-2 border-top">
                    {commentError && (
                      <div className="alert alert-danger py-1 small mb-2">{commentError}</div>
                    )}
                    <div className="mb-2">
                      <textarea
                        className="form-control form-control-sm"
                        rows={3}
                        placeholder="Write a public comment for the requester..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={postingComment}
                        maxLength={2000}
                        data-testid="public-comment-input"
                      ></textarea>
                      <div className="d-flex justify-content-between align-items-center mt-1">
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {newComment.length} / 2,000 characters
                        </small>
                        <button
                          type="submit"
                          className="btn btn-success btn-sm px-3"
                          disabled={postingComment || newComment.trim().length < 2}
                          data-testid="submit-public-comment-btn"
                        >
                          {postingComment ? 'Posting...' : '📨 Post Public Comment'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Internal Notes Tab */}
              {activeTab === 'notes' && (
                <div data-testid="notes-tab-pane">
                  {/* Amber Confidential Banner */}
                  <div
                    className="alert alert-warning border-warning d-flex align-items-center py-2 px-3 mb-3 small"
                    data-testid="internal-notes-banner"
                    style={{ backgroundColor: '#fff8e6', borderColor: '#ffe08a' }}
                  >
                    <span className="me-2 fs-5">🔒</span>
                    <div>
                      <strong className="d-block text-dark">Confidential Internal Notes</strong>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        Visible only to IT Staff & Administrators. Never disclosed to Requesters.
                      </span>
                    </div>
                  </div>

                  {loadingNotes ? (
                    <div className="py-3 text-center text-muted small">Loading internal notes...</div>
                  ) : notes.length === 0 ? (
                    <p className="text-muted small py-3 text-center mb-0">No internal notes recorded yet.</p>
                  ) : (
                    <div className="notes-list mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {notes.map((n) => (
                        <div
                          key={n.id}
                          className="card border-warning border-start-4 p-2 mb-2 rounded shadow-none"
                          style={{ backgroundColor: '#fffcf2', borderLeftWidth: '4px' }}
                          data-testid={`internal-note-item-${n.id}`}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <div>
                              <span className="me-1">🔒</span>
                              <strong className="small text-dark">{n.author.name}</strong>
                              {renderRoleBadge(n.author.role)}
                            </div>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {formatDate(n.createdAt)}
                            </small>
                          </div>
                          <p className="small mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                            {n.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Save Internal Note Form */}
                  <form onSubmit={handlePostNote} className="mt-3 pt-2 border-top">
                    {noteError && (
                      <div className="alert alert-danger py-1 small mb-2">{noteError}</div>
                    )}
                    <div className="mb-2">
                      <textarea
                        className="form-control form-control-sm border-warning"
                        rows={3}
                        placeholder="Write a private internal note for the team..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        disabled={postingNote}
                        maxLength={2000}
                        data-testid="internal-note-input"
                      ></textarea>
                      <div className="d-flex justify-content-between align-items-center mt-1">
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {newNote.length} / 2,000 characters
                        </small>
                        <button
                          type="submit"
                          className="btn btn-warning text-dark btn-sm px-3 fw-bold"
                          disabled={postingNote || newNote.trim().length < 2}
                          data-testid="submit-internal-note-btn"
                        >
                          {postingNote ? 'Saving...' : '🔒 Save Internal Note'}
                        </button>
                      </div>
                    </div>
                  </form>
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
