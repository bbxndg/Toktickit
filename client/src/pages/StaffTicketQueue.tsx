import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface StaffTicketItem {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: string;
  itPriority: string | null;
  status: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requester: { id: number; name: string; email: string; department?: string };
  owner: { id: number; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  activeAttachmentsCount: number;
}

interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface QueueCounts {
  total: number;
  unassigned: number;
  open: number;
  inProgress: number;
  waitingForRequester: number;
}

interface StaffTicketQueueProps {
  onSelectTicket: (ticketId: number) => void;
}

export const StaffTicketQueue: React.FC<StaffTicketQueueProps> = ({ onSelectTicket }) => {
  const { token, user } = useAuth();

  const [tickets, setTickets] = useState<StaffTicketItem[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [queueCounts, setQueueCounts] = useState<QueueCounts>({
    total: 0,
    unassigned: 0,
    open: 0,
    inProgress: 0,
    waitingForRequester: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });

  // Filter & Search states
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [requestedPriority, setRequestedPriority] = useState('');
  const [itPriority, setItPriority] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 300ms Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load reference metadata (Categories & Active Staff)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [catRes, staffRes] = await Promise.all([
          fetch(`${API_BASE}/api/categories`),
          fetch(`${API_BASE}/api/staff/members`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);

        if (catRes.ok) {
          const cats = await catRes.json();
          setCategories(cats);
        }
        if (staffRes.ok) {
          const members = await staffRes.json();
          setStaffMembers(members);
        }
      } catch (err) {
        console.error('Failed to load queue metadata:', err);
      }
    };

    fetchMetadata();
  }, [token]);

  // Fetch queue tickets from backend
  const fetchQueueTickets = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (categoryId) params.append('categoryId', categoryId);
      if (status) params.append('status', status);
      if (requestedPriority) params.append('requestedPriority', requestedPriority);
      if (itPriority) params.append('itPriority', itPriority);
      if (ownerId) params.append('ownerId', ownerId);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', String(page));
      params.append('pageSize', '10');

      const res = await fetch(`${API_BASE}/api/staff/tickets?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Failed to load tickets (${res.status})`);
      }

      const data = await res.json();
      setTickets(data.data || []);
      setPagination(data.pagination || { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 });
      if (data.queueCounts) {
        setQueueCounts(data.queueCounts);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to service desk.');
    } finally {
      setLoading(false);
    }
  }, [token, debouncedSearch, categoryId, status, requestedPriority, itPriority, ownerId, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchQueueTickets();
  }, [fetchQueueTickets]);

  const hasActiveFilters = Boolean(
    searchInput || categoryId || status || requestedPriority || itPriority || ownerId
  );

  const clearAllFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setCategoryId('');
    setStatus('');
    setRequestedPriority('');
    setItPriority('');
    setOwnerId('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  const renderStatusBadge = (st: string) => {
    switch (st) {
      case 'NEW':
        return <span className="badge bg-secondary">New</span>;
      case 'OPEN':
        return <span className="badge bg-primary">Open</span>;
      case 'IN_PROGRESS':
        return <span className="badge bg-warning text-dark">In Progress</span>;
      case 'WAITING_FOR_REQUESTER':
        return <span className="badge bg-info text-dark">Waiting for Requester</span>;
      case 'RESOLVED':
        return <span className="badge bg-success">Resolved</span>;
      case 'CLOSED':
        return <span className="badge bg-dark">Closed</span>;
      case 'REOPENED':
        return <span className="badge bg-danger">Reopened</span>;
      case 'CANCELLED':
        return <span className="badge bg-secondary">Cancelled</span>;
      default:
        return <span className="badge bg-light text-dark">{st}</span>;
    }
  };

  const renderPriorityBadge = (prio: string | null) => {
    if (!prio) return <span className="text-muted small">—</span>;
    switch (prio) {
      case 'CRITICAL':
        return <span className="badge bg-danger">Critical</span>;
      case 'HIGH':
        return <span className="badge bg-warning text-dark">High</span>;
      case 'MEDIUM':
        return <span className="badge bg-primary">Medium</span>;
      case 'LOW':
        return <span className="badge bg-secondary">Low</span>;
      default:
        return <span className="badge bg-light text-dark">{prio}</span>;
    }
  };

  return (
    <div className="container-fluid px-0" data-testid="staff-ticket-queue">
      {/* Header & Live Queue Summary Chips */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
        <div>
          <h2 className="h4 fw-bold mb-1" style={{ color: 'var(--zg-primary)' }}>
            📥 IT Staff Ticket Queue
          </h2>
          <p className="text-muted small mb-0">
            Triage, claim, reassign, and manage support tickets across all company departments.
          </p>
        </div>

        {/* Queue Live Summary Chips */}
        <div className="d-flex flex-wrap align-items-center gap-2" data-testid="queue-summary-chips">
          <button
            type="button"
            className={`btn btn-sm ${!status && !ownerId ? 'btn-success' : 'btn-outline-secondary'}`}
            onClick={clearAllFilters}
            title="Show all tickets"
          >
            All <span className="badge bg-light text-dark ms-1">{queueCounts.total}</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${ownerId === 'unassigned' ? 'btn-warning text-dark' : 'btn-outline-warning text-dark'}`}
            onClick={() => {
              clearAllFilters();
              setOwnerId('unassigned');
            }}
            title="Filter unassigned tickets"
          >
            Unassigned <span className="badge bg-dark text-light ms-1">{queueCounts.unassigned}</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${status === 'OPEN' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => {
              clearAllFilters();
              setStatus('OPEN');
            }}
            title="Filter open tickets"
          >
            Open <span className="badge bg-light text-dark ms-1">{queueCounts.open}</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${status === 'IN_PROGRESS' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}
            onClick={() => {
              clearAllFilters();
              setStatus('IN_PROGRESS');
            }}
            title="Filter in-progress tickets"
          >
            In Progress <span className="badge bg-light text-dark ms-1">{queueCounts.inProgress}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card shadow-sm border-0 p-3 mb-3 bg-white" data-testid="staff-queue-toolbar">
        <div className="row g-2 align-items-center">
          {/* Search keyword input */}
          <div className="col-12 col-md-4 col-lg-3">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light">🔍</span>
              <input
                type="text"
                className="form-control"
                placeholder="Search ticket # or summary..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                data-testid="staff-queue-search"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="col-6 col-md-2 col-lg-2">
            <select
              className="form-select form-select-sm"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              data-testid="staff-queue-category-filter"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-6 col-md-2 col-lg-2">
            <select
              className="form-select form-select-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              data-testid="staff-queue-status-filter"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* IT Priority Filter */}
          <div className="col-6 col-md-2 col-lg-1">
            <select
              className="form-select form-select-sm"
              value={itPriority}
              onChange={(e) => {
                setItPriority(e.target.value);
                setPage(1);
              }}
              data-testid="staff-queue-it-priority-filter"
              title="Filter by IT Priority"
            >
              <option value="">IT Priority</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Owner Filter */}
          <div className="col-6 col-md-2 col-lg-2">
            <select
              className="form-select form-select-sm"
              value={ownerId}
              onChange={(e) => {
                setOwnerId(e.target.value);
                setPage(1);
              }}
              data-testid="staff-queue-owner-filter"
            >
              <option value="">All Owners</option>
              <option value="unassigned">⚠️ Unassigned</option>
              {user && <option value={user.id}>👤 Assigned to Me</option>}
              {staffMembers
                .filter((s) => s.id !== user?.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role === 'ADMINISTRATOR' ? 'Admin' : 'Staff'})
                  </option>
                ))}
            </select>
          </div>

          {/* Sort Selector & Clear Button */}
          <div className="col-12 col-lg-2 d-flex gap-1 justify-content-end">
            <select
              className="form-select form-select-sm"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
              data-testid="staff-queue-sort-filter"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="ticketNumber-asc">Ticket # (Asc)</option>
              <option value="status-asc">Status</option>
              <option value="updatedAt-desc">Recently Updated</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm text-nowrap"
                onClick={clearAllFilters}
                data-testid="staff-queue-clear-filters"
                title="Reset all filters"
              >
                🔄 Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="alert alert-danger py-2 small mb-3 shadow-sm" role="alert">
          ⚠️ {error}
          <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={fetchQueueTickets}>
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-5" data-testid="staff-queue-loading">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading ticket queue...</span>
          </div>
          <p className="mt-2 text-muted small">Loading queue tickets...</p>
        </div>
      )}

      {/* Content when loaded */}
      {!loading && !error && tickets.length === 0 && (
        <div className="card border-0 p-5 text-center shadow-sm" data-testid="staff-queue-empty">
          <div className="fs-1 mb-2">📭</div>
          <h5 className="fw-bold">No tickets match your filters</h5>
          <p className="text-muted small mb-3">Try adjusting your search criteria or resetting filters.</p>
          {hasActiveFilters && (
            <div>
              <button type="button" className="btn btn-sm btn-outline-success" onClick={clearAllFilters}>
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && !error && tickets.length > 0 && (
        <>
          {/* Desktop Table View (≥ 768px) */}
          <div className="d-none d-md-block card border-0 shadow-sm mb-3">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" data-testid="staff-queue-table">
                <thead className="table-light small">
                  <tr>
                    <th scope="col" className="ps-3">Ticket No</th>
                    <th scope="col">Created</th>
                    <th scope="col" style={{ width: '28%' }}>Summary & Requester</th>
                    <th scope="col">Category</th>
                    <th scope="col" className="text-center">Req. Priority</th>
                    <th scope="col" className="text-center">IT Priority</th>
                    <th scope="col" className="text-center">Status</th>
                    <th scope="col">Owner</th>
                    <th scope="col" className="text-end pe-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTicket(t.id)}
                      style={{ cursor: 'pointer' }}
                      data-testid={`staff-queue-row-${t.id}`}
                    >
                      <td className="ps-3 font-monospace fw-bold text-success text-nowrap">
                        {t.ticketNumber}
                        {t.activeAttachmentsCount > 0 && (
                          <span className="ms-1 small text-muted" title={`${t.activeAttachmentsCount} attachments`}>
                            📎
                          </span>
                        )}
                      </td>
                      <td className="small text-muted text-nowrap">{formatDate(t.createdAt)}</td>
                      <td>
                        <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: '320px' }}>
                          {t.summary}
                        </div>
                        <small className="text-muted">
                          👤 {t.requester.name} {t.requester.department && `(${t.requester.department})`}
                        </small>
                      </td>
                      <td className="small text-nowrap">{t.category?.name || '—'}</td>
                      <td className="text-center text-nowrap">{renderPriorityBadge(t.requestedPriority)}</td>
                      <td className="text-center text-nowrap">{renderPriorityBadge(t.itPriority)}</td>
                      <td className="text-center text-nowrap">{renderStatusBadge(t.status)}</td>
                      <td className="small text-nowrap">
                        {t.owner ? (
                          <span className="badge bg-light text-dark border">
                            👤 {t.owner.name}
                          </span>
                        ) : (
                          <span className="badge bg-warning text-dark">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="text-end pe-3">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm py-0 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket(t.id);
                          }}
                          data-testid={`view-detail-btn-${t.id}`}
                        >
                          View Detail ➔
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="d-block d-md-none mb-3" data-testid="staff-queue-mobile-cards">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="card shadow-sm border-0 p-3 mb-2"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectTicket(t.id)}
                data-testid={`staff-queue-card-${t.id}`}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="font-monospace fw-bold text-success">{t.ticketNumber}</span>
                  <div>{renderStatusBadge(t.status)}</div>
                </div>

                <div className="fw-bold text-dark mb-1">{t.summary}</div>
                <div className="text-muted small mb-2">
                  👤 {t.requester.name} {t.requester.department && `(${t.requester.department})`}
                </div>

                <div className="d-flex justify-content-between align-items-center small border-top pt-2 mt-1">
                  <div>
                    {t.owner ? (
                      <span className="badge bg-light text-dark border">👤 {t.owner.name}</span>
                    ) : (
                      <span className="badge bg-warning text-dark">Unassigned</span>
                    )}
                  </div>
                  <div className="d-flex gap-1 align-items-center">
                    {renderPriorityBadge(t.itPriority || t.requestedPriority)}
                    <span className="text-muted ms-1" style={{ fontSize: '0.75rem' }}>
                      {formatDate(t.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="card border-0 shadow-sm p-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-2" data-testid="staff-queue-pagination">
            <small className="text-muted">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems} tickets
            </small>

            <nav aria-label="Queue navigation">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${pagination.page <= 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                  >
                    ‹ Previous
                  </button>
                </li>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((num) => (
                  <li key={num} className={`page-item ${num === pagination.page ? 'active' : ''}`}>
                    <button className="page-link" type="button" onClick={() => setPage(num)}>
                      {num}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${pagination.page >= pagination.totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    type="button"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next ›
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </>
      )}
    </div>
  );
};
